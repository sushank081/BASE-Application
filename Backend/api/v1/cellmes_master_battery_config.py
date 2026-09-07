from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from db.session import get_db
from models.cellmes_master_battery_config import CellmesMasterBatteryConfig
from schemas.cellmes_master_battery_config import BatteryConfigCreate, BatteryConfigUpdate, BatteryConfigResponse

router = APIRouter(prefix="/cellmes_master_battery_config", tags=["Battery Component Configurations"])

# 1. GET Method - Fetches all rows and executes an optimized join for the custom flat layout view
@router.get("/", response_model=List[BatteryConfigResponse])
def get_all_battery_configs(db: Session = Depends(get_db)):
    configs = db.query(CellmesMasterBatteryConfig).options(
        joinedload(CellmesMasterBatteryConfig.pack),
        joinedload(CellmesMasterBatteryConfig.bms),
        joinedload(CellmesMasterBatteryConfig.module)
    ).all()
    return configs


# 2. POST Method - Asserts a mapping intersection validation instance
@router.post("/", response_model=BatteryConfigResponse, status_code=status.HTTP_201_CREATED)
def create_battery_config(payload: BatteryConfigCreate, db: Session = Depends(get_db)):
    new_config = CellmesMasterBatteryConfig(
        pack_id=payload.pack_id,
        bms_id=payload.bms_id,
        module_id=payload.module_id
    )
    db.add(new_config)
    db.commit()
    db.refresh(new_config)
    return new_config


# 3. PATCH Method - Partially update parameters using target config row ID
@router.patch("/{id}", response_model=BatteryConfigResponse)
def update_battery_config(id: int, payload: BatteryConfigUpdate, db: Session = Depends(get_db)):
    db_config = db.query(CellmesMasterBatteryConfig).filter(CellmesMasterBatteryConfig.id == id).first()
    
    if not db_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Battery configuration profile link with ID {id} could not be located in master records."
        )

    update_data = payload.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No parameters provided for entity modification."
        )

    for key, value in update_data.items():
        setattr(db_config, key, value)

    # Stamping current validation update timestamp on operational column property
    db_config.updated_ = datetime.now()

    db.commit()
    db.refresh(db_config)
    return db_config