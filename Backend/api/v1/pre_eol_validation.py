from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.pack_scan_validation import CellmesAppPackScan, CellmesAppPackWo
from models.leak_test_validation import CellmesAppLeakTest
from models.pre_eol_validation import CellmesAppPreEol
from models.nc_clearance import CellmesAppNcClearance  # Clean global import
from schemas.pre_eol_validation import PreEolValidationPayload, PreEolValidationResponse

router = APIRouter(prefix="/production/pre-eol", tags=["Battery Pack Pre-EOL Testing Gate"])

@router.post("/process-result", response_model=PreEolValidationResponse)
def validate_and_log_pre_eol(payload: PreEolValidationPayload, db: Session = Depends(get_db)):
    
    # Map incoming hardware-specific keys to our local evaluation tokens
    incoming_serial = payload.BatteryPackNumber
    incoming_status = payload.Status
    incoming_error_info = payload.ErrorInformation
    incoming_fail_reason = payload.FailReason

    # Helper function to mark pack pre_eol_status as 'NOK' when any gate validation fails
    def mark_pack_nok_and_raise(pack_obj: CellmesAppPackScan, http_status_code: int, detail_msg: str):
        if pack_obj:
            pack_obj.pre_eol_status = "NOK"
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
        .filter(CellmesAppPackScan.pack_number == incoming_serial)
        .first()
    )

    if not registered_pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sequence Deviation Error: Pack Serial '{incoming_serial}' has not been registered at the Pack Line station yet."
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

    # NEW STATUS CHECK: Reject if work order execution has not been initialized
    if active_wo.wo_status == "NEW":
        mark_pack_nok_and_raise(
            registered_pack,
            status.HTTP_400_BAD_REQUEST,
            "Process Violation: Work Order is in 'NEW' status. Pack assembly execution has not started."
        )

    # SCENARIO 2A: Active Work Order HOLD Check
    if active_wo.wo_status == "HOLD":
        # Fetch the latest NC ticket ONLY when wo_status is HOLD, ordered by ID DESC
        latest_nc = (
            db.query(CellmesAppNcClearance)
            .filter(
                CellmesAppNcClearance.pack_serial == incoming_serial,
                CellmesAppNcClearance.station_id == "PREEOL"
            )
            .order_by(CellmesAppNcClearance.id.desc())
            .first()
        )

        if latest_nc and latest_nc.nc_cleared == "YES":
            # 1. Elevate Work Order status to REWORKED
            active_wo.wo_status = "REWORKED"

            # 2. Update is_reworked flag to 1 for the existing Pre-EOL record
            latest_pre_eol_record = (
                db.query(CellmesAppPreEol)
                .filter(CellmesAppPreEol.pack_id == registered_pack.id)
                .order_by(CellmesAppPreEol.id.desc())
                .first()
            )
            if latest_pre_eol_record:
                latest_pre_eol_record.is_reworked = 1

            db.flush()
        else:
            # Rejection if nc_cleared == "NO" or no NC ticket exists for PREEOL
            fail_ctx = latest_nc.fail_reason if latest_nc else "Unresolved Quality Deviation at Pre-EOL"
            mark_pack_nok_and_raise(
                registered_pack,
                status.HTTP_403_FORBIDDEN,
                f"Interlock Rejection: Conveyor locked. Battery Pack is currently on quality 'HOLD'. Reason: {fail_ctx}."
            )

    # Enforce allowed operational tracking work order states
    if active_wo.wo_status not in ["STARTED", "REWORKED"]:
        mark_pack_nok_and_raise(
            registered_pack,
            status.HTTP_400_BAD_REQUEST,
            f"Process Violation: Work Order is in an invalid state: '{active_wo.wo_status}'. Assembly blocked."
        )

    # -------------------------------------------------------------------------
    # GATE 3: Upstream Operation Verification (Leak Test Check)
    # -------------------------------------------------------------------------
    latest_leak_test = (
        db.query(CellmesAppLeakTest)
        .filter(CellmesAppLeakTest.pack_id == registered_pack.id)
        .order_by(CellmesAppLeakTest.id.desc())
        .first()
    )

    if not latest_leak_test or str(latest_leak_test.leak_test_result).upper() != "PASS":
        mark_pack_nok_and_raise(
            registered_pack,
            status.HTTP_428_PRECONDITION_REQUIRED,
            f"Process Sequence Violation: Pack Serial '{incoming_serial}' cannot proceed to Pre-EOL. Upstream Leak Test must have a 'PASS' status first."
        )

    # -------------------------------------------------------------------------
    # GATE 4: Current Table Record & Rework Latch Check
    # -------------------------------------------------------------------------
    existing_pre_eol = (
        db.query(CellmesAppPreEol)
        .filter(CellmesAppPreEol.pack_id == registered_pack.id)
        .order_by(CellmesAppPreEol.id.desc())
        .first()
    )

    if existing_pre_eol:
        # If record exists, verify unlatching toggle flag
        if existing_pre_eol.is_reworked == 0:
            mark_pack_nok_and_raise(
                registered_pack,
                status.HTTP_409_CONFLICT,
                f"Duplicate Process Error: Electrical Pre-EOL inspection records already exist for Pack [{incoming_serial}]."
            )
        # If is_reworked == 1, validation proceeds to append a brand new row execution tracking block below

    # Standardize incoming payload status input to clean uppercase token formats
    execution_verdict = incoming_status.upper()

    # -------------------------------------------------------------------------
    # DATA MUTATION TRANSACTION SEGMENT
    # -------------------------------------------------------------------------
    try:
        # Initialize base test entry instance parameters
        new_pre_eol_log = CellmesAppPreEol(
            pack_id=registered_pack.id,
            pre_eol_status=execution_verdict,
            category=incoming_fail_reason if incoming_fail_reason else None,
            remarks=incoming_error_info if incoming_error_info else None,
            is_reworked=0  # Reset quality unlatch tracking property back to zero on the new row instance
        )
        db.add(new_pre_eol_log)

        # PASS VALIDATION PATHWAY
        if execution_verdict == "PASS":
            # Update cellmes_app_pack_scan pre_eol_status to 'OK'
            registered_pack.pre_eol_status = "OK"

            db.commit()
            db.refresh(new_pre_eol_log)

            return PreEolValidationResponse(
                status="SUCCESS",
                message="Electrical Pre-EOL gate diagnostics parameters verified and recorded successfully.",
                pre_eol_record_id=new_pre_eol_log.id,
                matched_pack_id=new_pre_eol_log.pack_id,
                saved_status=new_pre_eol_log.pre_eol_status,
                processed_at=datetime.now()
            )

        # FAIL VALIDATION PATHWAY
        elif execution_verdict == "FAIL":
            # Update cellmes_app_pack_scan pre_eol_status to 'NOK'
            registered_pack.pre_eol_status = "NOK"

            # 1. Flip active engineering Work Order routing property straight to HOLD
            active_wo.wo_status = "HOLD"

            # 2. Append an open quality failure tracking ticket inside the global clearance registry
            new_nc_ticket = CellmesAppNcClearance(
                pack_id=registered_pack.id,
                pack_serial=incoming_serial,
                station_id="PREEOL",
                nc_cleared="NO",
                fail_reason=incoming_fail_reason if incoming_fail_reason else "Electrical Insulation Fault",
                remarks=incoming_error_info if incoming_error_info else "Pre-EOL Continuity test machine rejection logged."
            )
            db.add(new_nc_ticket)

            db.commit()
            db.refresh(new_pre_eol_log)

            return PreEolValidationResponse(
                status="REJECTED",
                message="Diagnostics Failure Logged: Battery pack failed Pre-EOL electrical testing metrics. Routing lock set to HOLD.",
                pre_eol_record_id=new_pre_eol_log.id,
                matched_pack_id=new_pre_eol_log.pack_id,
                saved_status=new_pre_eol_log.pre_eol_status,
                processed_at=datetime.now()
            )

        else:
            registered_pack.pre_eol_status = "NOK"
            db.commit()
            raise ValueError(f"Unknown testing payload diagnostic verdict parameter: '{execution_verdict}'")

    except Exception as db_err:
        db.rollback()
        # Mark as NOK on unexpected transaction error if registered_pack is present
        if registered_pack:
            try:
                registered_pack.pre_eol_status = "NOK"
                db.commit()
            except Exception:
                db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Shop Floor Exception: Pre-EOL transaction recording execution aborted. Context: {str(db_err)}"
        )