from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class NcClearanceResponse(BaseModel):
    id: int
    pack_id: int
    pack_serial: Optional[str] = None
    station_id: str
    nc_cleared: str
    fail_reason: Optional[str] = None
    remarks: Optional[str] = None
    created_date: datetime
    updated_date: Optional[datetime] = None
    nc_cleared_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class NcClearanceUpdatePayload(BaseModel):
    nc_cleared: str = Field(..., max_length=10, json_schema_extra={"example": "YES"})
    fail_reason: Optional[str] = Field(None, max_length=50)
    remarks: Optional[str] = Field(None, max_length=150)

class NcClearanceUpdateResponse(BaseModel):
    status: str
    message: str
    nc_record_id: int
    updated_nc_status: str
    linked_wo_status: str
    unlatched_station: str
    processed_at: datetime

    class Config:
        from_attributes = True