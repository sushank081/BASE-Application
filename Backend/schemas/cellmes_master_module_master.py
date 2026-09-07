from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# Shared Core Fields
class ModuleMasterBase(BaseModel):
    model: Optional[str] = Field(None, max_length=50, json_schema_extra={"example": "string"})
    part_no: Optional[str] = Field(None, max_length=16, json_schema_extra={"example": "string"})
    lh_part_no: Optional[str] = Field(None, max_length=16, json_schema_extra={"example": "string"})
    rh_part_no: Optional[str] = Field(None, max_length=16, json_schema_extra={"example": "string"})
    part_name: Optional[str] = Field(None, max_length=10, json_schema_extra={"example": "string"})
    kw: Optional[str] = Field(None, max_length=5, json_schema_extra={"example": "string"})

# Payload Schema used for creating data records (POST)
class ModuleMasterCreate(ModuleMasterBase):
    pass

# Payload Schema used for modifying records partially (PATCH)
class ModuleMasterUpdate(BaseModel):
    model: Optional[str] = Field(None, max_length=50, json_schema_extra={"example": "string"})
    part_no: Optional[str] = Field(None, max_length=16, json_schema_extra={"example": "string"})
    lh_part_no: Optional[str] = Field(None, max_length=16, json_schema_extra={"example": "string"})
    rh_part_no: Optional[str] = Field(None, max_length=16, json_schema_extra={"example": "string"})
    part_name: Optional[str] = Field(None, max_length=10, json_schema_extra={"example": "string"})
    kw: Optional[str] = Field(None, max_length=5, json_schema_extra={"example": "string"})
    is_active: Optional[str] = Field(None, max_length=10, json_schema_extra={"example": "string"})

# Serialization format rules returned to frontend (GET)
class ModuleMasterResponse(ModuleMasterBase):
    id: int
    created_date: datetime
    updated_date: Optional[datetime] = None
    # is_active: Optional[str] = None  # Uncomment if column is added to database later

    class Config:
        from_attributes = True