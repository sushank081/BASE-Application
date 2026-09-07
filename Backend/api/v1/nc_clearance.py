from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.nc_clearance import CellmesAppNcClearance
from schemas.nc_clearance import NcClearanceResponse, NcClearanceUpdatePayload, NcClearanceUpdateResponse

router = APIRouter(prefix="/production/nc-management", tags=["Shop Floor Quality Clearance Hub"])

# =============================================================================
# 1. GET METHOD: RETRIEVE ALL DEFECT LOG RECORDS
# =============================================================================
@router.get("/tickets", response_model=List[NcClearanceResponse])
def get_all_nc_clearance_records(db: Session = Depends(get_db)):
    """
    Fetches all historical quality non-conformance records from the database registry.
    """
    return db.query(CellmesAppNcClearance).order_by(CellmesAppNcClearance.id.desc()).all()


# =============================================================================
# 2. PATCH METHOD: UPDATE TICKET STATUS ONLY
# =============================================================================
@router.patch("/tickets/{ticket_id}/clearance", response_model=NcClearanceUpdateResponse)
def modify_and_clear_nc_ticket(ticket_id: int, payload: NcClearanceUpdatePayload, db: Session = Depends(get_db)):
    """
    Updates the non-conformance ticket fields (fail_reason, remarks, nc_cleared).
    Strictly updates the ticket record without side-effects on Work Orders or Station tables.
    """
    # 1. Locate the targeted quality ticket row
    nc_ticket = db.query(CellmesAppNcClearance).filter(CellmesAppNcClearance.id == ticket_id).first()
    if not nc_ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Query Error: Ticket record ID [{ticket_id}] not found."
        )

    target_nc_state = payload.nc_cleared.upper()
    current_time = datetime.now()

    try:
        # 2. Update metadata and status directly on the ticket record
        if payload.fail_reason is not None:
            nc_ticket.fail_reason = payload.fail_reason
        if payload.remarks is not None:
            nc_ticket.remarks = payload.remarks
            
        nc_ticket.nc_cleared = target_nc_state
        nc_ticket.updated_date = current_time

        if target_nc_state == "YES":
            nc_ticket.nc_cleared_date = current_time

        db.commit()
        db.refresh(nc_ticket)

        return NcClearanceUpdateResponse(
            status="SUCCESS",
            message="Quality ticket updated successfully.",
            nc_record_id=nc_ticket.id,
            updated_nc_status=nc_ticket.nc_cleared,
            linked_wo_status="UNCHANGED",
            unlatched_station=nc_ticket.station_id,
            processed_at=current_time
        )

    except Exception as db_err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Manufacturing Exception: Quality ticket mutation aborted. Context: {str(db_err)}"
        )