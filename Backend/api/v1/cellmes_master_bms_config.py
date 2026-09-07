from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.cellmes_master_bms_config import CellmesMasterBmsConfig
from schemas.cellmes_master_bms_config import BmsConfigCreate, BmsConfigUpdate, BmsConfigResponse

router = APIRouter(prefix="/cellmes_master_bms_config", tags=["BMS Configurations"])

# 1. GET Method - Fetch all BMS configs
@router.get("/", response_model=List[BmsConfigResponse])
def get_all_bms_configs(db: Session = Depends(get_db)):
    configs = db.query(CellmesMasterBmsConfig).all()
    return configs


# 2. POST Method - Create a new BMS config record
@router.post("/", response_model=BmsConfigResponse, status_code=status.HTTP_201_CREATED)
def create_bms_config(payload: BmsConfigCreate, db: Session = Depends(get_db)):
    new_config = CellmesMasterBmsConfig(
        bms_name=payload.bms_name,
        bms_material_id=payload.bms_material_id
    )
    db.add(new_config)
    db.commit()
    db.refresh(new_config)
    return new_config


# 3. PATCH Method - Update parameters selectively using target row ID
@router.patch("/{id}", response_model=BmsConfigResponse)
def update_bms_config(id: int, payload: BmsConfigUpdate, db: Session = Depends(get_db)):
    db_config = db.query(CellmesMasterBmsConfig).filter(CellmesMasterBmsConfig.id == id).first()
    
    if not db_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"BMS configuration profile with ID {id} could not be located."
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
        setattr(db_config, key, value)

    # Stamp runtime modification tracking update time
    db_config.updated_date = datetime.now()

    db.commit()
    db.refresh(db_config)
    return db_config