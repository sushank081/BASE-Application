from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.pack_scan_validation import (
    CellmesAppPackWo, 
    CellmesAppPackScan, 
    CellmesAppLhrhScanNonmes
)
from models.module_scan_validation import CellmesAppLhrlScan 
from models.cellmes_master_battery_config import CellmesMasterBatteryConfig
from models.cellmes_master_pack_config import CellmesMasterPackConfig
from models.cellmes_master_bms_config import CellmesMasterBmsConfig
from models.cellmes_master_module_config import CellmesMasterModuleConfig
from schemas.pack_scan_validation import PackScanValidationPayload, PackScanValidationResponse

router = APIRouter(prefix="/production/pack-line", tags=["Battery Pack Interlock Operations Engine"])


def derive_nonmes_module_serial(lh_serial: str) -> str:
    """
    Derives module_serial from Left-Hand (LH) serial prefix rules for Non-MES mode.
    """
    lh = lh_serial.strip()

    if lh.startswith("M2L"):
        return "M2M" + lh[3:]
    elif lh.startswith("M3L"):
        return "M3M" + lh[3:]
    elif lh.startswith("M4L"):
        return "M4M" + lh[3:]
    elif lh.startswith("3L"):
        return "3M" + lh[2:]
    elif lh.startswith("4L"):
        return "4M" + lh[2:]
    elif lh.startswith("2L"):
        return "2M" + lh[2:]
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid Serial Prefix: Scanned LH Serial [{lh}] does not match any recognized "
                f"variant format rules (Expected prefixes: 3L, 4L, M2L, 2L, M3L, M4L)."
            )
        )


@router.post("/validate-and-scan", response_model=PackScanValidationResponse, status_code=status.HTTP_201_CREATED)
def validate_and_process_pack_marriage(
    payload: PackScanValidationPayload, 
    db: Session = Depends(get_db)
):
    clean_lh = payload.lh_serial.strip()
    clean_rh = payload.rh_serial.strip()
    clean_pack = payload.pack_serial.strip()
    clean_bms = payload.bms_serial.strip()
    mode = payload.mode.upper()

    if mode not in ['A', 'M']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Operation Mode: '{payload.mode}'. Expected 'A' or 'M'."
        )

    # =========================================================================
    # COMMON VALIDATION 1: Serial Lengths, Duplication & Master Config Existence
    # =========================================================================
    if len(clean_pack) < 14 or len(clean_pack) > 52:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Hardware Error: Invalid barcode length for Pack Serial ({len(clean_pack)} chars). Must be between 14 and 52 characters."
        )
    if len(clean_bms) < 14 or len(clean_bms) > 74:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Hardware Error: Invalid barcode length for BMS Serial ({len(clean_bms)} chars). Must be between 14 and 74 characters."
        )

    # -------------------------------------------------------------------------
    # DUPLICATION CHECK: Ensure Pack Serial and BMS Serial are unique
    # -------------------------------------------------------------------------
    duplicate_pack = (
        db.query(CellmesAppPackScan)
        .filter(CellmesAppPackScan.pack_number == clean_pack)
        .first()
    )
    if duplicate_pack:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplication Error: Battery Pack Serial [{clean_pack}] already exists in pack scan records."
        )

    duplicate_bms = (
        db.query(CellmesAppPackScan)
        .filter(CellmesAppPackScan.bms_number == clean_bms)
        .first()
    )
    if duplicate_bms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplication Error: BMS Serial [{clean_bms}] already exists in pack scan records."
        )

    # -------------------------------------------------------------------------
    # MATERIAL ID EXTRACTION & MASTER CONFIG CHECKS
    # -------------------------------------------------------------------------
    scanned_pack_material = clean_pack[:14]
    scanned_bms_material = clean_bms[:14]

    # Verify Pack Material ID exists in cellmes_master_pack_config with is_active = 'YES'
    pack_cfg = (
        db.query(CellmesMasterPackConfig)
        .filter(
            CellmesMasterPackConfig.pack_material_id == scanned_pack_material,
            CellmesMasterPackConfig.is_active == "YES"
        )
        .first()
    )
    if not pack_cfg:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Configuration Error: Pack Material ID [{scanned_pack_material}] not found or inactive in Master Pack Config."
        )

    # Verify BMS Material ID exists in cellmes_master_bms_config with is_active = 'YES'
    bms_cfg = (
        db.query(CellmesMasterBmsConfig)
        .filter(
            CellmesMasterBmsConfig.bms_material_id == scanned_bms_material,
            CellmesMasterBmsConfig.is_active == "YES"
        )
        .first()
    )
    if not bms_cfg:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Configuration Error: BMS Material ID [{scanned_bms_material}] not found or inactive in Master BMS Config."
        )

    # =========================================================================
    # COMMON VALIDATION 2: Locate Oldest Scheduled Work Order (FIFO)
    # =========================================================================
    active_wo = (
        db.query(CellmesAppPackWo)
        .filter(
            CellmesAppPackWo.wo_status == "SCHEDULED",
            CellmesAppPackWo.wo_used == 0,
            CellmesAppPackWo.material_number == scanned_pack_material
        )
        .order_by(CellmesAppPackWo.id.asc())
        .first()
    )

    if not active_wo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interlock Error: No 'SCHEDULED' Work Order exists matching Pack material ID: {scanned_pack_material}"
        )

    # =========================================================================
    # OPERATION 1: MODE 'A' (AUTOMATED / MES)
    # =========================================================================
    if mode == 'A':
        # Validation 3 (Mode A): Check LH/RH existence in cellmes_app_lhrl_scan and material match
        lh_scan_row = db.query(CellmesAppLhrlScan).filter(CellmesAppLhrlScan.lh_serial == clean_lh).first()
        rh_scan_row = db.query(CellmesAppLhrlScan).filter(CellmesAppLhrlScan.rh_serial == clean_rh).first()

        if not lh_scan_row:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Traceability Error: Scanned Left-Hand Serial [{clean_lh}] not found in MES database records."
            )
        if not rh_scan_row:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Traceability Error: Scanned Right-Hand Serial [{clean_rh}] not found in MES database records."
            )

        if lh_scan_row.material_number != rh_scan_row.material_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"BOM Rejection: Left-Hand Module material ({lh_scan_row.material_number}) does not match Right-Hand Module material ({rh_scan_row.material_number})."
            )

        module_material_id = lh_scan_row.material_number

        # Check module_material_id exists in CellmesMasterModuleConfig
        module_cfg = db.query(CellmesMasterModuleConfig).filter(CellmesMasterModuleConfig.module_material_id == module_material_id).first()
        if not module_cfg:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Configuration Conflict: Module Material ID [{module_material_id}] not found in Master Module Config."
            )

        # Validation 4 (Mode A): Check recipe configuration in cellmes_master_battery_config
        master_lock = (
            db.query(CellmesMasterBatteryConfig)
            .filter(
                CellmesMasterBatteryConfig.pack_id == pack_cfg.id,
                CellmesMasterBatteryConfig.bms_id == bms_cfg.id,
                CellmesMasterBatteryConfig.module_id == module_cfg.id,
                CellmesMasterBatteryConfig.is_active == "ACTIVE"
            )
            .first()
        )

        if not master_lock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="BOM Validation Mismatch: Scanned combination of Pack Enclosure, Modules, and BMS is not an authorized active recipe configuration."
            )

        # Execute Database Mutations for Mode 'A'
        try:
            # 1. wo_used = 1, wo_status = 'STARTED'
            active_wo.wo_used = 1
            active_wo.wo_status = "STARTED"

            # 2. Update consumption flags on MES module scan records
            lh_scan_row.is_lh_consumed = 1
            lh_scan_row.updated_date = datetime.now()

            rh_scan_row.is_rh_consumed = 1
            rh_scan_row.updated_date = datetime.now()

            # 3. Insert into cellmes_app_pack_scan
            executed_pack_record = CellmesAppPackScan(
                wo_id=active_wo.id,
                pack_number=clean_pack,
                lh_id=lh_scan_row.id,
                rh_id=rh_scan_row.id,
                lhrh_id_nonmes=None,
                bms_number=clean_bms,
                pre_eol_status="NO",
                chroma_status="NO",
                pdi_status="NO",
                overall_status="NO"
            )

            db.add(executed_pack_record)
            db.commit()
            db.refresh(executed_pack_record)

            return {
                "status": "SUCCESS",
                "message": "Component marriage interlock cleared under Mode 'A'. Battery pack tracked successfully.",
                "mode": "A",
                "pack_scan_record_id": executed_pack_record.id,
                "linked_wo_number": active_wo.wo_number,
                "extracted_pack_material_id": scanned_pack_material,
                "lhrh_id_nonmes": None,
                "processed_at": datetime.now()
            }

        except Exception as trans_err:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Shop Floor Exception: Mode 'A' manufacturing transaction aborted. Context: {str(trans_err)}"
            )

    # =========================================================================
    # OPERATION 2: MODE 'M' (MANUAL / NON-MES)
    # =========================================================================
    else:  # mode == 'M'
        # Validation 3 (Mode M): Uniqueness check in cellmes_app_lhrh_scan_nonmes
        existing_lh = db.query(CellmesAppLhrhScanNonmes).filter(
            CellmesAppLhrhScanNonmes.lh_serial == clean_lh
        ).first()

        if existing_lh:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplication Error: Left-Hand Serial [{clean_lh}] already exists in Non-MES records."
            )

        existing_rh = db.query(CellmesAppLhrhScanNonmes).filter(
            CellmesAppLhrhScanNonmes.rh_serial == clean_rh
        ).first()

        if existing_rh:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplication Error: Right-Hand Serial [{clean_rh}] already exists in Non-MES records."
            )

        # Derive module_serial using prefix rules
        created_module_serial = derive_nonmes_module_serial(clean_lh)

        # Validation 4 (Mode M): Check pack_cfg.id and bms_cfg.id configured in cellmes_master_battery_config with is_active = 'ACTIVE'
        master_lock = (
            db.query(CellmesMasterBatteryConfig)
            .filter(
                CellmesMasterBatteryConfig.pack_id == pack_cfg.id,
                CellmesMasterBatteryConfig.bms_id == bms_cfg.id,
                CellmesMasterBatteryConfig.is_active == "ACTIVE"
            )
            .first()
        )

        if not master_lock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="BOM Validation Mismatch: Scanned combination of Pack Enclosure and BMS is not configured in any active recipe."
            )

        # Execute Database Mutations for Mode 'M'
        try:
            # 1. wo_used = 1, wo_status = 'STARTED'
            active_wo.wo_used = 1
            active_wo.wo_status = "STARTED"

            # 2. Insert into cellmes_app_lhrh_scan_nonmes
            nonmes_record = CellmesAppLhrhScanNonmes(
                lh_serial=clean_lh,
                rh_serial=clean_rh,
                module_serial=created_module_serial
            )
            db.add(nonmes_record)
            db.flush()  # Generates nonmes_record.id

            # 3. Insert into cellmes_app_pack_scan
            executed_pack_record = CellmesAppPackScan(
                wo_id=active_wo.id,
                pack_number=clean_pack,
                lh_id=None,
                rh_id=None,
                lhrh_id_nonmes=nonmes_record.id,
                bms_number=clean_bms,
                pre_eol_status="NO",
                chroma_status="NO",
                pdi_status="NO",
                overall_status="NO"
            )

            db.add(executed_pack_record)
            db.commit()
            db.refresh(executed_pack_record)

            return {
                "status": "SUCCESS",
                "message": "Component marriage interlock cleared under Mode 'M'. Non-MES record logged successfully.",
                "mode": "M",
                "pack_scan_record_id": executed_pack_record.id,
                "linked_wo_number": active_wo.wo_number,
                "extracted_pack_material_id": scanned_pack_material,
                "lhrh_id_nonmes": nonmes_record.id,
                "processed_at": datetime.now()
            }

        except Exception as trans_err:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Shop Floor Exception: Mode 'M' manufacturing transaction aborted. Context: {str(trans_err)}"
            )