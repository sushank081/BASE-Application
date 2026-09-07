from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.cellmes_master_module_master import CellmesMasterModuleMaster
from schemas.cellmes_master_module_master import ModuleMasterCreate, ModuleMasterUpdate, ModuleMasterResponse

router = APIRouter(prefix="/cellmes_master_module_master", tags=["Module Master Management"])

# 1. GET Method - Fetch all Module master records
@router.get("/", response_model=List[ModuleMasterResponse])
def get_all_module_master_records(db: Session = Depends(get_db)):
    records = db.query(CellmesMasterModuleMaster).all()
    return records


# 2. POST Method - Create a new Module master record
@router.post("/", response_model=ModuleMasterResponse, status_code=status.HTTP_201_CREATED)
def create_module_master_record(payload: ModuleMasterCreate, db: Session = Depends(get_db)):
    new_record = CellmesMasterModuleMaster(
        model=payload.model,
        part_no=payload.part_no,
        lh_part_no=payload.lh_part_no,
        rh_part_no=payload.rh_part_no,
        part_name=payload.part_name,
        kw=payload.kw
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record


# 3. PATCH Method - Update parameters selectively using target row ID
@router.patch("/{id}", response_model=ModuleMasterResponse)
def update_module_master_record(id: int, payload: ModuleMasterUpdate, db: Session = Depends(get_db)):
    db_record = db.query(CellmesMasterModuleMaster).filter(CellmesMasterModuleMaster.id == id).first()
    
    if not db_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module master profile with ID {id} could not be located."
        )

    # Convert schema payload to dictionary while ignoring items that aren't set
    update_data = payload.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No parameters provided for modification."
        )

    # Apply configuration modifications dynamically
    for key, value in update_data.items():
        # Safeguard to ignore is_active field if column doesn't exist in SQL schema yet
        if key == "is_active" and not hasattr(db_record, "is_active"):
            continue
        setattr(db_record, key, value)

    # Stamp runtime modification tracking update time
    db_record.updated_date = datetime.now()

    db.commit()
    db.refresh(db_record)
    return db_record