from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.cellmes_master_pack_config import CellmesMasterPackConfig
from schemas.cellmes_master_pack_config import PackConfigCreate, PackConfigUpdate, PackConfigResponse

router = APIRouter(prefix="/cellmes_master_pack_config", tags=["Pack Configurations"])

@router.get("/", response_model=List[PackConfigResponse])
def get_all_pack_configs(db: Session = Depends(get_db)):
    
    configs = (
        db.query(CellmesMasterPackConfig)
        .order_by(CellmesMasterPackConfig.id.asc())  # Guarantees identical row sorting order
        .all()
    )
    return configs


# 2. POST Method - Create a new pack configuration instance
@router.post("/", response_model=PackConfigResponse, status_code=status.HTTP_201_CREATED)
def create_pack_config(payload: PackConfigCreate, db: Session = Depends(get_db)):
    new_config = CellmesMasterPackConfig(
        pack_name=payload.pack_name,
        pack_material_id=payload.pack_material_id
    )
    db.add(new_config)
    db.commit()
    db.refresh(new_config)
    return new_config


# 3. PATCH Method - Partially update configuration settings using targeted ID
@router.patch("/{id}", response_model=PackConfigResponse)
def update_pack_config(id: int, payload: PackConfigUpdate, db: Session = Depends(get_db)):
    # Look up target configuration row inside PostgreSQL engine
    db_config = db.query(CellmesMasterPackConfig).filter(CellmesMasterPackConfig.id == id).first()
    
    if not db_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pack configuration profile with ID {id} could not be located in terminal database mappings."
        )

    # Filter out sent input payload parameters that aren't empty (None)
    update_data = payload.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload modification processing aborted. No parameters provided for execution loop modification."
        )

    # Set properties dynamically onto mapped execution reference instance
    for key, value in update_data.items():
        setattr(db_config, key, value)

    # Explicitly stamp updating operational execution moment timestamps
    db_config.updated_date = datetime.now()

    db.commit()
    db.refresh(db_config)
    return db_config