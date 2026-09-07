from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.master_defect import CellmesMasterDefectList
from schemas.master_defect import DefectCreate, DefectUpdate, DefectResponse

router = APIRouter(
    prefix="/master/defects",
    tags=["Master Defect List Operations"]
)


# -----------------------------------------------------------------------------
# 1. GET: Fetch all master defect records
# -----------------------------------------------------------------------------
@router.get("", response_model=List[DefectResponse])
def get_all_defects(db: Session = Depends(get_db)):
    """
    Retrieves all registered defect records from cellmes_master_defect_list.
    """
    defects = (
        db.query(CellmesMasterDefectList)
        .order_by(CellmesMasterDefectList.id.asc())
        .all()
    )
    return defects


# -----------------------------------------------------------------------------
# 2. POST: Create a new defect entry (defect_name)
# -----------------------------------------------------------------------------
@router.post("", response_model=DefectResponse, status_code=status.HTTP_201_CREATED)
def create_defect(payload: DefectCreate, db: Session = Depends(get_db)):
    """
    Creates a new defect entry using defect_name.
    is_active defaults to 'ACTIVE'.
    """
    clean_defect_name = payload.defect_name.strip()

    if not clean_defect_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Defect name cannot be empty."
        )

    # Check for duplicate defect name
    existing_defect = (
        db.query(CellmesMasterDefectList)
        .filter(CellmesMasterDefectList.defect_name.ilike(clean_defect_name))
        .first()
    )
    if existing_defect:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Defect '{clean_defect_name}' already exists in master registry."
        )

    new_defect = CellmesMasterDefectList(
        defect_name=clean_defect_name,
        is_active="ACTIVE"
    )

    db.add(new_defect)
    db.commit()
    db.refresh(new_defect)

    return new_defect


# -----------------------------------------------------------------------------
# 3. PATCH: Update existing defect (defect_name, is_active)
# -----------------------------------------------------------------------------
@router.patch("/{defect_id}", response_model=DefectResponse)
def update_defect(
    defect_id: int, 
    payload: DefectUpdate, 
    db: Session = Depends(get_db)
):
    """
    Partially updates an existing defect record by ID (defect_name, is_active).
    """
    defect_record = (
        db.query(CellmesMasterDefectList)
        .filter(CellmesMasterDefectList.id == defect_id)
        .first()
    )

    if not defect_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Defect record with ID #{defect_id} not found."
        )

    # Update defect_name if provided
    if payload.defect_name is not None:
        clean_name = payload.defect_name.strip()
        if not clean_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Defect name cannot be empty."
            )
        
        # Check if the new name conflicts with another entry
        duplicate_check = (
            db.query(CellmesMasterDefectList)
            .filter(
                CellmesMasterDefectList.defect_name.ilike(clean_name),
                CellmesMasterDefectList.id != defect_id
            )
            .first()
        )
        if duplicate_check:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another defect named '{clean_name}' already exists."
            )

        defect_record.defect_name = clean_name

    # Update is_active status if provided
    if payload.is_active is not None:
        clean_status = payload.is_active.strip().upper()
        if clean_status not in ["ACTIVE", "INACTIVE", "YES", "NO"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="is_active must be 'ACTIVE', 'INACTIVE', 'YES', or 'NO'."
            )
        defect_record.is_active = clean_status

    db.commit()
    db.refresh(defect_record)

    return defect_record