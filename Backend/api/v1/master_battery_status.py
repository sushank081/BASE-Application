from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.master_battery_status import CellmesMasterBatteryStatus
from schemas.master_battery_status import (
    BatteryStatusCreate,
    BatteryStatusUpdate,
    BatteryStatusResponse,
)

router = APIRouter(
    prefix="/master/battery-statuses",
    tags=["Master Battery Status Operations"]
)


# -----------------------------------------------------------------------------
# 1. GET: Fetch all master battery status records
# -----------------------------------------------------------------------------
@router.get("", response_model=List[BatteryStatusResponse])
def get_all_battery_statuses(db: Session = Depends(get_db)):
    """
    Retrieves all registered battery status records from cellmes_master_battery_status.
    """
    statuses = (
        db.query(CellmesMasterBatteryStatus)
        .order_by(CellmesMasterBatteryStatus.id.asc())
        .all()
    )
    return statuses


# -----------------------------------------------------------------------------
# 2. POST: Create a new battery status entry (status_name)
# -----------------------------------------------------------------------------
@router.post("", response_model=BatteryStatusResponse, status_code=status.HTTP_201_CREATED)
def create_battery_status(payload: BatteryStatusCreate, db: Session = Depends(get_db)):
    """
    Creates a new battery status record using status_name.
    is_active defaults to 'ACTIVE'.
    """
    clean_status_name = payload.status_name.strip()

    if not clean_status_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status name cannot be empty."
        )

    # Check for duplicate status name
    existing_status = (
        db.query(CellmesMasterBatteryStatus)
        .filter(CellmesMasterBatteryStatus.status_name.ilike(clean_status_name))
        .first()
    )
    if existing_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Battery status '{clean_status_name}' already exists in master registry."
        )

    new_status = CellmesMasterBatteryStatus(
        status_name=clean_status_name,
        is_active="ACTIVE"
    )

    db.add(new_status)
    db.commit()
    db.refresh(new_status)

    return new_status


# -----------------------------------------------------------------------------
# 3. PATCH: Update existing battery status (status_name, is_active)
# -----------------------------------------------------------------------------
@router.patch("/{status_id}", response_model=BatteryStatusResponse)
def update_battery_status(
    status_id: int,
    payload: BatteryStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Partially updates an existing battery status record by ID (status_name, is_active).
    """
    status_record = (
        db.query(CellmesMasterBatteryStatus)
        .filter(CellmesMasterBatteryStatus.id == status_id)
        .first()
    )

    if not status_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Battery status record with ID #{status_id} not found."
        )

    # Update status_name if provided
    if payload.status_name is not None:
        clean_name = payload.status_name.strip()
        if not clean_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status name cannot be empty."
            )

        # Check for duplication with other records
        duplicate_check = (
            db.query(CellmesMasterBatteryStatus)
            .filter(
                CellmesMasterBatteryStatus.status_name.ilike(clean_name),
                CellmesMasterBatteryStatus.id != status_id
            )
            .first()
        )
        if duplicate_check:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another battery status named '{clean_name}' already exists."
            )

        status_record.status_name = clean_name

    # Update is_active status if provided
    if payload.is_active is not None:
        clean_status = payload.is_active.strip().upper()
        if clean_status not in ["ACTIVE", "INACTIVE", "YES", "NO"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="is_active status must be 'ACTIVE', 'INACTIVE', 'YES', or 'NO'."
            )
        status_record.is_active = clean_status

    db.commit()
    db.refresh(status_record)

    return status_record