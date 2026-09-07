from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class ModuleWorkOrderResponse(BaseModel):
    id: int
    wo_number: str
    po_number: str
    material_number: str
    part_name: str
    bop_id: str
    work_station: str
    status: str
    schedule_time: Optional[datetime] = None
    job_end_time: Optional[datetime] = None
    created_on: datetime
    updated_on: Optional[datetime] = None
    wo_used: int
    line_id: Optional[int] = None

    class Config:
        from_attributes = True