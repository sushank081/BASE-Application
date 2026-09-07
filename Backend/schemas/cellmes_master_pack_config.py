from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# Shared Core Fields
class PackConfigBase(BaseModel):
    pack_name: Optional[str] = Field(None, max_length=50, example="string")
    pack_material_id: str = Field(..., max_length=14, example="string")

# Payload Schema used for creating configurations (POST)
class PackConfigCreate(PackConfigBase):
    pass

# Payload Schema used for modifying existing configurations dynamically (PATCH)
class PackConfigUpdate(BaseModel):
    pack_name: Optional[str] = Field(None, max_length=50, example="string")
    pack_material_id: Optional[str] = Field(None, max_length=14, example="string")
    is_active: Optional[str] = Field(None, max_length=10, example="NO")

# Database Response Serialization formatting rules (GET)
class PackConfigResponse(PackConfigBase):
    id: int
    is_active: str
    created_date: datetime
    updated_date: Optional[datetime] = None

    class Config:
        from_attributes = True  # Allows Pydantic to read SQLAlchemy lazy objects cleanly