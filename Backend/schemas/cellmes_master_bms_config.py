from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# Shared Core Fields
class BmsConfigBase(BaseModel):
    bms_name: Optional[str] = Field(None, max_length=50, json_schema_extra={"example": "string"})
    bms_material_id: str = Field(..., max_length=14, json_schema_extra={"example": "string"})

# Payload Schema used for creating data records (POST)
class BmsConfigCreate(BmsConfigBase):
    pass

# Payload Schema used for modifying records partially (PATCH)
class BmsConfigUpdate(BaseModel):
    bms_name: Optional[str] = Field(None, max_length=50, json_schema_extra={"example": "string"})
    bms_material_id: Optional[str] = Field(None, max_length=14, json_schema_extra={"example": "string"})
    is_active: Optional[str] = Field(None, max_length=10, json_schema_extra={"example": "string"})

# Serialization format rules returned to frontend (GET)
class BmsConfigResponse(BmsConfigBase):
    id: int
    is_active: str
    created_date: datetime
    updated_date: Optional[datetime] = None

    class Config:
        from_attributes = True  # Allows parsing SQLAlchemy lazy objects smoothly