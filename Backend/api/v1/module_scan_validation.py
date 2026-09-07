from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from db.session import get_db
from models.module_scan_validation import CellmessAppModuleWo, CellmesAppLhrlScan
from models.cellmes_master_module_config import CellmesMasterModuleConfig
from schemas.module_scan_validation import ModuleScanValidationPayload, ModuleScanValidationResponse

router = APIRouter(prefix="/production/module-line", tags=["Production Execution Line Engine"])

@router.post("/validate-and-scan", response_model=ModuleScanValidationResponse)
def validate_and_process_module_scan(payload: ModuleScanValidationPayload, db: Session = Depends(get_db)):
    
    # -------------------------------------------------------------------------
    # STEP 1: Derive module_serial from lh_serial Prefix Transformation Rules
    # -------------------------------------------------------------------------
    lh = payload.lh_serial if payload.lh_serial else ""
    rh = payload.rh_serial if payload.rh_serial else ""
    derived_module_serial = None

    # Check 3-character prefix patterns first to prevent overlap
    if lh.startswith("M2L"):
        derived_module_serial = "M2M" + lh[3:]
    elif lh.startswith("M3L"):
        derived_module_serial = "M3M" + lh[3:]
    elif lh.startswith("M4L"):
        derived_module_serial = "M4M" + lh[3:]
    # Check 2-character prefix patterns
    elif lh.startswith("3L"):
        derived_module_serial = "3M" + lh[2:]
    elif lh.startswith("4L"):
        derived_module_serial = "4M" + lh[2:]
    elif lh.startswith("2L"):
        derived_module_serial = "2M" + lh[2:]
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid Serial Prefix: Scanned LH Serial [{lh}] does not match any recognized "
                f"variant format rules (Expected prefixes: 3L, 4L, M2L, 2L, M3L, M4L)."
            )
        )

    # -------------------------------------------------------------------------
    # STEP 1b: Verify Hardware Serials Do Not Already Exist (Duplicate Protection)
    # -------------------------------------------------------------------------
    duplicate_check = (
        db.query(CellmesAppLhrlScan)
        .filter(
            or_(
                CellmesAppLhrlScan.lh_serial == lh,
                CellmesAppLhrlScan.rh_serial == rh,
                CellmesAppLhrlScan.lh_serial == rh,  # Edge cross-over case security check
                CellmesAppLhrlScan.rh_serial == lh
            )
        )
        .first()
    )

    if duplicate_check:
        matched_type = "LH Barcode" if (duplicate_check.lh_serial in (lh, rh)) else "RH Barcode"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Traceability Interlock Halt: One or both scanned hardware component tokens already exist in "
                f"historical traceability logs. Violation source matched on recorded {matched_type}."
            )
        )

    # -------------------------------------------------------------------------
    # STEP 2: Locate Oldest 'SCHEDULED' Work Order for Target Line (FIFO Check)
    # -------------------------------------------------------------------------
    active_wo = (
        db.query(CellmessAppModuleWo)
        .filter(
            CellmessAppModuleWo.status == "SCHEDULED",
            CellmessAppModuleWo.wo_used == 0,
            CellmessAppModuleWo.line_id == payload.line_id
        )
        .order_by(CellmessAppModuleWo.created_on.asc())  # FIFO queue sequence
        .first()
    )

    if not active_wo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Execution Halt: No 'SCHEDULED' Work Orders found for Production Line {payload.line_id}."
        )

    # -------------------------------------------------------------------------
    # STEP 3: Validate Work Order Material Code against Module Master Configuration
    # -------------------------------------------------------------------------
    master_config = (
        db.query(CellmesMasterModuleConfig)
        .filter(
            CellmesMasterModuleConfig.module_material_id == active_wo.material_number,
            CellmesMasterModuleConfig.is_active == "ACTIVE"
        )
        .first()
    )

    if not master_config:
        # Check if the material code exists at all but is just suspended/inactive
        inactive_check = (
            db.query(CellmesMasterModuleConfig)
            .filter(CellmesMasterModuleConfig.module_material_id == active_wo.material_number)
            .first()
        )
        
        if inactive_check:
            error_detail = (
                f"BOM Configuration Interlock: Work order material code [{active_wo.material_number}] "
                f"is present but its system status is currently set to '{inactive_check.is_active}'. "
                f"Configuration must be explicitly marked 'ACTIVE' to authorize line allocation updates."
            )
        else:
            error_detail = (
                f"BOM Configuration Mismatch: Work order material code [{active_wo.material_number}] "
                f"is not defined in the cellmes_master_module_config database ledger table."
            )

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error_detail
        )

    # -------------------------------------------------------------------------
    # STEP 4: Database State Mutation & Record Persistence
    # -------------------------------------------------------------------------
    try:
        # Update active work order properties
        active_wo.wo_used = 1
        active_wo.status = "COMPLETED"
        active_wo.updated_on = datetime.now()
        
        # Insert trace component scan record using generated derived_module_serial
        saved_scan = CellmesAppLhrlScan(
            wo_id=active_wo.id,
            lh_serial=payload.lh_serial,
            is_lh_consumed=0,  # Unconsumed flag open for downstream operations
            rh_serial=payload.rh_serial,
            is_rh_consumed=0,  # Unconsumed flag open for downstream operations
            module_serial=derived_module_serial,
            line_id=payload.line_id,
            material_number=active_wo.material_number  # <-- ADDED COLUMN VALUE MAPPING HERE
        )
        
        db.add(saved_scan)
        db.commit() 
        db.refresh(saved_scan)

        # Return full response including the newly generated module serial number
        return ModuleScanValidationResponse(
            status="SUCCESS",
            message="Component matching logic verified. Data logged cleanly.",
            scan_record_id=saved_scan.id,
            matched_wo_number=active_wo.wo_number,
            updated_wo_status=active_wo.status,
            module_serial=derived_module_serial,  # <-- FIXED KEY HERE
            processed_at=datetime.now()
        )

    except Exception as db_err:
        db.rollback() 
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Operational Database Exception: Transaction aborted. Context: {str(db_err)}"
        )