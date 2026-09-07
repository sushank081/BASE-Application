from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.pack_scan_validation import CellmesAppPackScan, CellmesAppPackWo
from models.leak_test_validation import CellmesAppLeakTest
from models.pre_eol_validation import CellmesAppPreEol
from models.eol_validation import CellmesAppEol
from models.pdi_validation import CellmesAppPdiStation
from models.nc_clearance import CellmesAppNcClearance  # Clean global import
from schemas.pdi_validation import PdiValidationPayload, PdiValidationResponse

router = APIRouter(prefix="/production/pdi", tags=["Battery Pack PDI Gate-Release Engine"])

@router.post("/process-result", response_model=PdiValidationResponse)
def validate_and_process_pdi_gate(payload: PdiValidationPayload, db: Session = Depends(get_db)):
    
    # Helper function to mark pack pdi_status as 'NOK' when any gate validation fails
    def mark_pack_nok_and_raise(pack_obj: CellmesAppPackScan, http_status_code: int, detail_msg: str):
        if pack_obj:
            pack_obj.pdi_status = "NOK"
            db.commit()
        raise HTTPException(
            status_code=http_status_code,
            detail=detail_msg
        )

    # -------------------------------------------------------------------------
    # GATE 1: Verify existence of pack serial in master pack scan database
    # -------------------------------------------------------------------------
    registered_pack = (
        db.query(CellmesAppPackScan)
        .filter(CellmesAppPackScan.pack_number == payload.pack_serial)
        .first()
    )

    if not registered_pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sequence Deviation Error: Pack Serial '{payload.pack_serial}' has not been registered at the Pack Line station yet."
        )

    # -------------------------------------------------------------------------
    # GATE 2: Work Order & Non-Conformance Clearance Synchronization Engine
    # -------------------------------------------------------------------------
    active_wo = (
        db.query(CellmesAppPackWo)
        .filter(CellmesAppPackWo.id == registered_pack.wo_id)
        .first()
    )

    if not active_wo:
        mark_pack_nok_and_raise(
            registered_pack,
            status.HTTP_404_NOT_FOUND,
            "System Error: Linked Work Order context not found for this battery pack configuration."
        )

    # State Machine Evaluation Paths
    if active_wo.wo_status == "NEW":
        mark_pack_nok_and_raise(
            registered_pack,
            status.HTTP_400_BAD_REQUEST,
            "Process Violation: Work Order is in a 'NEW' status. Pack assembly execution has not started."
        )

    # Active HOLD Check
    if active_wo.wo_status == "HOLD":
        # Fetch the latest NC ticket ONLY when wo_status is HOLD specifically for station_id = PDI
        latest_nc = (
            db.query(CellmesAppNcClearance)
            .filter(
                CellmesAppNcClearance.pack_serial == payload.pack_serial,
                CellmesAppNcClearance.station_id == "PDI"
            )
            .order_by(CellmesAppNcClearance.id.desc())
            .first()
        )

        if latest_nc and latest_nc.nc_cleared == "YES":
            active_wo.wo_status = "REWORKED"

            latest_pdi_record = (
                db.query(CellmesAppPdiStation)
                .filter(CellmesAppPdiStation.pack_id == registered_pack.id)
                .order_by(CellmesAppPdiStation.id.desc())
                .first()
            )
            if latest_pdi_record and latest_pdi_record.is_reworked == 0:
                latest_pdi_record.is_reworked = 1

            # Persist unlatch updates directly to the database
            db.commit()
        else:
            fail_ctx = latest_nc.fail_reason if latest_nc else "Unresolved Quality Deviation at PDI"
            mark_pack_nok_and_raise(
                registered_pack,
                status.HTTP_403_FORBIDDEN,
                f"Interlock Rejection: Conveyor locked. Battery Pack is currently on quality 'HOLD'. Reason: {fail_ctx}."
            )

    if active_wo.wo_status not in ["STARTED", "REWORKED"]:
        mark_pack_nok_and_raise(
            registered_pack,
            status.HTTP_400_BAD_REQUEST,
            f"Process Violation: Work Order is in an invalid state: '{active_wo.wo_status}'. Assembly blocked."
        )

    # -------------------------------------------------------------------------
    # GATE 3: Upstream Operation Verification (Chroma EOL Completion Check)
    # -------------------------------------------------------------------------
    upstream_eol = (
        db.query(CellmesAppEol)
        .filter(CellmesAppEol.pack_id == registered_pack.id)
        .order_by(CellmesAppEol.id.desc())
        .first()
    )

    if not upstream_eol or str(upstream_eol.final_status).upper() != "PASS":
        mark_pack_nok_and_raise(
            registered_pack,
            status.HTTP_428_PRECONDITION_REQUIRED,
            f"Process Sequence Violation: Pack Serial '{payload.pack_serial}' cannot proceed to PDI review. Downstream Chroma EOL test must have a 'PASS' status first."
        )

    # Gather required preceding diagnostics telemetry values using safe row fetches
    upstream_leak_row = (
        db.query(CellmesAppLeakTest.leak_test_value)
        .filter(CellmesAppLeakTest.pack_id == registered_pack.id)
        .order_by(CellmesAppLeakTest.id.desc())
        .first()
    )
    upstream_leak = upstream_leak_row[0] if upstream_leak_row else None

    upstream_pre_eol_row = (
        db.query(CellmesAppPreEol.pre_eol_status)
        .filter(CellmesAppPreEol.pack_id == registered_pack.id)
        .order_by(CellmesAppPreEol.id.desc())
        .first()
    )
    upstream_pre_eol = upstream_pre_eol_row[0] if upstream_pre_eol_row else None

    # Apply safe fallback layout values to prevent schema null rejections
    leak_status_str = str(upstream_leak) if upstream_leak is not None else "UNKNOWN"
    pre_eol_status_str = str(upstream_pre_eol) if upstream_pre_eol is not None else "UNKNOWN"
    chroma_status_str = str(upstream_eol.final_status) if upstream_eol.final_status is not None else "UNKNOWN"

    # -------------------------------------------------------------------------
    # GATE 4: Current Table Record & Rework Latch Check
    # -------------------------------------------------------------------------
    existing_pdi = (
        db.query(CellmesAppPdiStation)
        .filter(CellmesAppPdiStation.pack_id == registered_pack.id)
        .order_by(CellmesAppPdiStation.id.desc())
        .first()
    )

    # Track historical metrics for internal increment calculations on retested units
    base_rework_count = 0

    if existing_pdi:
        if existing_pdi.is_reworked == 0:
            mark_pack_nok_and_raise(
                registered_pack,
                status.HTTP_409_CONFLICT,
                f"Duplicate Process Error: Final Pre-Delivery Inspection logs already exist for Pack [{payload.pack_serial}]."
            )
        base_rework_count = existing_pdi.rework_count if existing_pdi.rework_count else 0

    # Normalize incoming status token format to handle case insensitivity cleanly
    normalized_status = payload.pdi_status.strip().upper() if payload.pdi_status else ""

    # -------------------------------------------------------------------------
    # DATA MUTATION TRANSACTION SEGMENT (OK / Conditionally Ok vs NOK Paths)
    # -------------------------------------------------------------------------
    try:
        # SCENARIO 1: PDI status maps to an acceptable passing check code (OK or CONDITIONALLY OK)
        if normalized_status in ["OK", "CONDITIONALLY OK"]:
            # Keep display value standardized
            saved_verdict = "Ok" if normalized_status == "OK" else "Conditionally Ok"
            
            # 1. Update master pack scan PDI status and Overall status to 'OK'
            registered_pack.pdi_status = "OK"
            registered_pack.overall_status = "OK"

            # 2. Update the linked engineering Work Order tracking state to COMPLETED
            active_wo.wo_status = "COMPLETED"
            active_wo.end_time = datetime.now()  # Sets completion timestamp

            # 3. Build the PDI entry log configuration
            new_pdi_log = CellmesAppPdiStation(
                pack_id=registered_pack.id,
                leak_test_status=leak_status_str,
                pre_eol_status=pre_eol_status_str,
                chroma_test=chroma_status_str,
                PDI=saved_verdict,
                defect_name=None,
                pdi_remarks=payload.pdi_remarks,
                pack_status=None,
                defect_source=None,
                rework_count=base_rework_count,
                is_reworked=0  # Reset quality unlatch tracking property
            )
            db.add(new_pdi_log)
            db.commit()
            db.refresh(new_pdi_log)

            return PdiValidationResponse(
                status="SUCCESS",
                message="PDI Release Verdict signed off successfully. Work order status updated to COMPLETED. Station clear.",
                pdi_record_id=new_pdi_log.id,
                matched_pack_id=new_pdi_log.pack_id,
                assigned_rework_count=new_pdi_log.rework_count if new_pdi_log.rework_count else 0,
                processed_at=datetime.now()
            )

        # SCENARIO 2: PDI status is 'NOK' (Trigger Defect Escalation Routes)
        elif normalized_status == "NOK":
            # 1. Update master pack scan PDI status to 'NOK'
            registered_pack.pdi_status = "NOK"
            active_wo.wo_status = "HOLD"
            calculated_rework = base_rework_count + 1

            new_nok_log = CellmesAppPdiStation(
                pack_id=registered_pack.id,
                leak_test_status=leak_status_str,
                pre_eol_status=pre_eol_status_str,
                chroma_test=chroma_status_str,
                PDI="NOK",
                defect_name=payload.defect_name,
                pdi_remarks=payload.pdi_remarks,
                pack_status=payload.pack_status,
                defect_source=payload.defect_source,
                rework_count=calculated_rework,
                is_reworked=0
            )
            db.add(new_nok_log)

            new_nc_ticket = CellmesAppNcClearance(
                pack_id=registered_pack.id,
                pack_serial=payload.pack_serial,
                station_id="PDI",
                nc_cleared="NO",
                fail_reason=payload.defect_name if payload.defect_name else "PDI Visual/Functional Deviation",
                remarks=payload.pdi_remarks if payload.pdi_remarks else "Final gate Pre-Delivery Inspection rejection logged."
            )
            db.add(new_nc_ticket)

            db.commit()
            db.refresh(new_nok_log)

            return PdiValidationResponse(
                status="REJECTED",
                message="Defect parameters logged. Pack routed to manual troubleshooting loop with routing set to HOLD.",
                pdi_record_id=new_nok_log.id,
                matched_pack_id=new_nok_log.pack_id,
                assigned_rework_count=new_nok_log.rework_count,
                processed_at=datetime.now()
            )

        else:
            registered_pack.pdi_status = "NOK"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Validation Failure: Unknown pdi_status state layout token string pattern: '{payload.pdi_status}'."
            )

    except HTTPException:
        raise
    except Exception as db_err:
        db.rollback()
        if registered_pack:
            try:
                registered_pack.pdi_status = "NOK"
                db.commit()
            except Exception:
                db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Shop Floor Exception: PDI gate execution transaction recording aborted. Context: {str(db_err)}"
        )