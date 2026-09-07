from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, model_validator

# Base structural IDs
class BatteryConfigBase(BaseModel):
    pack_id: int = Field(..., json_schema_extra={"example": 1})
    bms_id: int = Field(..., json_schema_extra={"example": 1})
    module_id: int = Field(..., json_schema_extra={"example": 1})

# Input schema payload for creating a complete deployment configuration (POST)
class BatteryConfigCreate(BatteryConfigBase):
    pass

# Input schema payload for modifying configurations (PATCH)
class BatteryConfigUpdate(BaseModel):
    pack_id: Optional[int] = Field(None, json_schema_extra={"example": 1})
    bms_id: Optional[int] = Field(None, json_schema_extra={"example": 1})
    module_id: Optional[int] = Field(None, json_schema_extra={"example": 1})
    is_active: Optional[str] = Field(None, max_length=10, json_schema_extra={"example": "string"})

# Flat View Output Schema (GET)
class BatteryConfigResponse(BaseModel):
    id: int
    pack_id: int
    pack_name: Optional[str] = None
    pack_material_id: Optional[str] = None
    bms_id: int
    bms_name: Optional[str] = None
    bms_material_id: Optional[str] = None
    module_id: int
    module_name: Optional[str] = None
    module_material_id: Optional[str] = None
    is_active: str
    creation_date: datetime
    updation_date: Optional[datetime] = None

    class Config:
        from_attributes = True

    # Pydantic lifecycle hook to dynamically flatten the relational join objects into the view schema
    @model_validator(mode="before")
    @classmethod
    def flatten_related_master_views(cls, data):
        if hasattr(data, "pack") or isinstance(data, dict):
            # When parsing directly from an ORM object query
            pack_obj = getattr(data, "pack", None)
            bms_obj = getattr(data, "bms", None)
            module_obj = getattr(data, "module", None)

            return {
                "id": getattr(data, "id"),
                "pack_id": getattr(data, "pack_id"),
                "pack_name": getattr(pack_obj, "pack_name", None) if pack_obj else None,
                "pack_material_id": getattr(pack_obj, "pack_material_id", None) if pack_obj else None,
                "bms_id": getattr(data, "bms_id"),
                "bms_name": getattr(bms_obj, "bms_name", None) if bms_obj else None,
                "bms_material_id": getattr(bms_obj, "bms_material_id", None) if bms_obj else None,
                "module_id": getattr(data, "module_id"),
                "module_name": getattr(module_obj, "module_name", None) if module_obj else None,
                "module_material_id": getattr(module_obj, "module_material_id", None) if module_obj else None,
                "is_active": getattr(data, "is_active"),
                "creation_date": getattr(data, "created_date"),
                "updation_date": getattr(data, "updated_"), # Maps structural DB column to your view naming request
            }
        return data