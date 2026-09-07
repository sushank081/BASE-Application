from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.master_defect_source import CellmesMasterDefectSource
from schemas.master_defect_source import (
    DefectSourceCreate,
    DefectSourceUpdate,
    DefectSourceResponse,
)

router = APIRouter(
    prefix="/master/defect-sources",
    tags=["Master Defect Source Operations"]
)


# -----------------------------------------------------------------------------
# 1. GET: Fetch all master defect source records
# -----------------------------------------------------------------------------
@router.get("", response_model=List[DefectSourceResponse])
def get_all_defect_sources(db: Session = Depends(get_db)):
    """
    Retrieves all registered defect source records from cellmes_master_defect_source.
    """
    sources = (
        db.query(CellmesMasterDefectSource)
        .order_by(CellmesMasterDefectSource.id.asc())
        .all()
    )
    return sources


# -----------------------------------------------------------------------------
# 2. POST: Create a new defect source entry (defect_name)
# -----------------------------------------------------------------------------
@router.post("", response_model=DefectSourceResponse, status_code=status.HTTP_201_CREATED)
def create_defect_source(payload: DefectSourceCreate, db: Session = Depends(get_db)):
    """
    Creates a new defect source record using defect_name.
    is_active defaults to 'ACTIVE'.
    """
    clean_defect_name = payload.defect_name.strip()

    if not clean_defect_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Defect source name cannot be empty."
        )

    # Check for duplicate defect source name
    existing_source = (
        db.query(CellmesMasterDefectSource)
        .filter(CellmesMasterDefectSource.defect_name.ilike(clean_defect_name))
        .first()
    )
    if existing_source:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Defect source '{clean_defect_name}' already exists in master registry."
        )

    new_source = CellmesMasterDefectSource(
        defect_name=clean_defect_name,
        is_active="ACTIVE"
    )

    db.add(new_source)
    db.commit()
    db.refresh(new_source)

    return new_source


# -----------------------------------------------------------------------------
# 3. PATCH: Update existing defect source (defect_name, is_active)
# -----------------------------------------------------------------------------
@router.patch("/{source_id}", response_model=DefectSourceResponse)
def update_defect_source(
    source_id: int,
    payload: DefectSourceUpdate,
    db: Session = Depends(get_db)
):
    """
    Partially updates an existing defect source record by ID (defect_name, is_active).
    """
    source_record = (
        db.query(CellmesMasterDefectSource)
        .filter(CellmesMasterDefectSource.id == source_id)
        .first()
    )

    if not source_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Defect source record with ID #{source_id} not found."
        )

    # Update defect_name if provided
    if payload.defect_name is not None:
        clean_name = payload.defect_name.strip()
        if not clean_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Defect source name cannot be empty."
            )

        # Check for duplication with other records
        duplicate_check = (
            db.query(CellmesMasterDefectSource)
            .filter(
                CellmesMasterDefectSource.defect_name.ilike(clean_name),
                CellmesMasterDefectSource.id != source_id
            )
            .first()
        )
        if duplicate_check:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another defect source named '{clean_name}' already exists."
            )

        source_record.defect_name = clean_name

    # Update is_active status if provided
    if payload.is_active is not None:
        clean_status = payload.is_active.strip().upper()
        if clean_status not in ["ACTIVE", "INACTIVE", "YES", "NO"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="is_active status must be 'ACTIVE', 'INACTIVE', 'YES', or 'NO'."
            )
        source_record.is_active = clean_status

    db.commit()
    db.refresh(source_record)

    return source_record