from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class PackWorkOrderResponse(BaseModel):
    id: int
    wo_number: str
    po_number: str
    schedule_time: Optional[datetime] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    wo_status: str
    work_station: Optional[str] = None
    created_on: Optional[datetime] = None
    order_type: Optional[str] = None
    material_number: Optional[str] = None
    bop_id: Optional[str] = None
    part_name: Optional[str] = None
    wo_used: int

    class Config:
        from_attributes = True