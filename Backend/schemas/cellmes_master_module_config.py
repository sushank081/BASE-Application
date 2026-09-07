from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# Shared Core Fields
class ModuleConfigBase(BaseModel):
    module_name: Optional[str] = Field(None, max_length=50, json_schema_extra={"example": "string"})
    module_material_id: str = Field(..., max_length=20, json_schema_extra={"example": "string"})

# Payload Schema used for creating data records (POST)
class ModuleConfigCreate(ModuleConfigBase):
    pass

# Payload Schema used for modifying records partially (PATCH)
class ModuleConfigUpdate(BaseModel):
    module_name: Optional[str] = Field(None, max_length=50, json_schema_extra={"example": "string"})
    module_material_id: Optional[str] = Field(None, max_length=20, json_schema_extra={"example": "string"})
    is_active: Optional[str] = Field(None, max_length=10, json_schema_extra={"example": "string"})

# Serialization format rules returned to frontend (GET)
class ModuleConfigResponse(ModuleConfigBase):
    id: int
    is_active: str
    creation_date: datetime
    updation_date: Optional[datetime] = None

    class Config:
        from_attributes = True