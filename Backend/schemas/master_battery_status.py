from typing import Optional
from pydantic import BaseModel


# Base Schema
class BatteryStatusBase(BaseModel):
    status_name: str


# Schema for POST (Creating a new battery status)
class BatteryStatusCreate(BatteryStatusBase):
    pass


# Schema for PATCH (Partial update of status_name and/or is_active)
class BatteryStatusUpdate(BaseModel):
    status_name: Optional[str] = None
    is_active: Optional[str] = None


# Schema for GET Response
class BatteryStatusResponse(BaseModel):
    id: int
    status_name: Optional[str] = None
    is_active: str

    class Config:
        from_attributes = True