from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.cellmes_master_module_config import CellmesMasterModuleConfig
from schemas.cellmes_master_module_config import ModuleConfigCreate, ModuleConfigUpdate, ModuleConfigResponse

router = APIRouter(prefix="/cellmes_master_module_config", tags=["Module Configurations"])

@router.get("/", response_model=List[ModuleConfigResponse])
def get_all_module_configs(db: Session = Depends(get_db)):
    configs = (
        db.query(CellmesMasterModuleConfig)
        .order_by(CellmesMasterModuleConfig.id.asc())  # Enforces strict ascending index alignment
        .all()
    )
    return configs

# 2. POST Method - Create a new Module config record
@router.post("/", response_model=ModuleConfigResponse, status_code=status.HTTP_201_CREATED)
def create_module_config(payload: ModuleConfigCreate, db: Session = Depends(get_db)):
    new_config = CellmesMasterModuleConfig(
        module_name=payload.module_name,
        module_material_id=payload.module_material_id
    )
    db.add(new_config)
    db.commit()
    db.refresh(new_config)
    return new_config


# 3. PATCH Method - Update parameters selectively using target row ID
@router.patch("/{id}", response_model=ModuleConfigResponse)
def update_module_config(id: int, payload: ModuleConfigUpdate, db: Session = Depends(get_db)):
    db_config = db.query(CellmesMasterModuleConfig).filter(CellmesMasterModuleConfig.id == id).first()
    
    if not db_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module configuration profile with ID {id} could not be located."
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
    db_config.updation_date = datetime.now()

    db.commit()
    db.refresh(db_config)
    return db_config