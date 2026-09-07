from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.pack_scan_validation import CellmesAppPackScan, CellmesAppPackWo
from models.leak_test_validation import CellmesAppLeakTest
from schemas.leak_test_validation import LeakTestValidationPayload, LeakTestValidationResponse
from models.nc_clearance import CellmesAppNcClearance

router = APIRouter(prefix="/production/leak-test", tags=["Battery Pack Leak Diagnostics Engine"])

@router.post("/process-result", response_model=LeakTestValidationResponse)
def validate_and_log_leak_test(payload: LeakTestValidationPayload, db: Session = Depends(get_db)):
    
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System Error: Linked Work Order context not found for this battery pack configuration."
        )

    # NEW STATUS CHECK: Reject if work order execution has not been initialized
    if active_wo.wo_status == "NEW":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Process Violation: Work Order is in 'NEW' status. Pack assembly execution has not started."
        )

    # SCENARIO 2A: Active Work Order HOLD Check
    if active_wo.wo_status == "HOLD":
        # Fetch the latest NC ticket ONLY when wo_status is HOLD specifically for station_id = LEAK
        latest_nc = (
            db.query(CellmesAppNcClearance)
            .filter(
                CellmesAppNcClearance.pack_serial == payload.pack_serial,
                CellmesAppNcClearance.station_id == "LEAK"
            )
            .order_by(CellmesAppNcClearance.id.desc())
            .first()
        )

        if latest_nc and latest_nc.nc_cleared == "YES":
            # 1. Elevate Work Order status to REWORKED
            active_wo.wo_status = "REWORKED"

            # 2. Update is_reworked flag to 1 for the existing leak record to pass duplicate checks
            latest_leak_record = (
                db.query(CellmesAppLeakTest)
                .filter(CellmesAppLeakTest.pack_id == registered_pack.id)
                .order_by(CellmesAppLeakTest.id.desc())
                .first()
            )
            if latest_leak_record:
                latest_leak_record.is_reworked = 1

            db.flush()
        else:
            # Rejection if nc_cleared == "NO" or no NC ticket exists for LEAK
            fail_ctx = latest_nc.fail_reason if latest_nc else "Unresolved Quality Deviation at Leak Test"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Interlock Rejection: Conveyor locked. Battery Pack is currently on quality 'HOLD'. Reason: {fail_ctx}."
            )

    # Enforce allowed operational tracking work order states
    if active_wo.wo_status not in ["STARTED", "REWORKED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Process Violation: Work Order is in an invalid state: '{active_wo.wo_status}'. Assembly blocked."
        )

    # -------------------------------------------------------------------------
    # GATE 3 & 4: Current Table Record & Rework Latch Check
    # -------------------------------------------------------------------------
    existing_test = (
        db.query(CellmesAppLeakTest)
        .filter(CellmesAppLeakTest.pack_id == registered_pack.id)
        .order_by(CellmesAppLeakTest.id.desc())
        .first()
    )

    if existing_test:
        # If record exists and has NOT been unlatched for rework -> Block as Duplicate
        if existing_test.is_reworked == 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate Process Error: Diagnostic records already exist for Pack [{payload.pack_serial}]. Duplicate entry rejected."
            )
        # Note: If is_reworked == 1, validation proceeds cleanly to execute the retest

    # Standardize result verdict formatting to uppercase
    execution_verdict = payload.status.upper()

    # -------------------------------------------------------------------------
    # DATA MUTATION TRANSACTION SEGMENT
    # -------------------------------------------------------------------------
    try:
        # Initialize new test log record with is_reworked = 0
        new_test_log = CellmesAppLeakTest(
            pack_id=registered_pack.id,
            leak_test_value=payload.leak_test_value,
            leak_test_result=execution_verdict,
            is_reworked=0  # Clear/reset rework flag on the new active record instance
        )
        db.add(new_test_log)

        # SCENARIO 1: Test Result is PASS
        if execution_verdict == "PASS":
            db.commit()
            db.refresh(new_test_log)
            
            return LeakTestValidationResponse(
                status="SUCCESS",
                message="Pneumatic leak decay diagnostics parameters verified and passed successfully.",
                leak_test_id=new_test_log.id,
                matched_pack_id=new_test_log.pack_id,
                saved_result=new_test_log.leak_test_result,
                logged_at=datetime.now()
            )

        # SCENARIO 2: Test Result is FAIL (Trigger Quality Routing Escalations)
        elif execution_verdict == "FAIL":
            # 1. Force state machine work order status directly to HOLD
            active_wo.wo_status = "HOLD"

            # 2. Open an entry row inside the consolidated cellmes_app_nc_clearance table
            new_nc_ticket = CellmesAppNcClearance(
                pack_id=registered_pack.id,
                pack_serial=payload.pack_serial,
                station_id="LEAK",
                nc_cleared="NO",
                fail_reason=f"Leak value deviation: {payload.leak_test_value} mbar/s",
                remarks="Automated machine diagnostics failure logged. Unit routed to teardown."
            )
            db.add(new_nc_ticket)
            
            db.commit()
            db.refresh(new_test_log)

            return LeakTestValidationResponse(
                status="REJECTED",
                message="Diagnostics Failure Logged: Battery pack failed leak metrics. Routing lock set to HOLD.",
                leak_test_id=new_test_log.id,
                matched_pack_id=new_test_log.pack_id,
                saved_result=new_test_log.leak_test_result,
                logged_at=datetime.now()
            )

        else:
            raise ValueError(f"Unknown testing payload diagnostic verdict parameter: '{execution_verdict}'")

    except Exception as trans_err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Shop Floor Exception: Leak test transaction loop aborted. Context: {str(trans_err)}"
        )