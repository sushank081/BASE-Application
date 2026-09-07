from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class PdiValidationPayload(BaseModel):
    pack_serial: str = Field(..., max_length=52, json_schema_extra={"example": "BB00000004655.B.000000HS01.G.177.1.1.B2PJCB26FG4079"})
    pdi_status: str = Field(..., max_length=50, description="Disposition options: 'Ok', 'Conditionally Ok', or 'NOK'", json_schema_extra={"example": "Ok"})
    defect_name: Optional[str] = Field(None, max_length=50)
    pdi_remarks: Optional[str] = Field(None, max_length=50)
    pack_status: Optional[str] = Field(None, max_length=50)
    defect_source: Optional[str] = Field(None, max_length=50)
    rework_count: Optional[int] = Field(None)

class PdiValidationResponse(BaseModel):
    status: str
    message: str
    pdi_record_id: int
    matched_pack_id: int
    assigned_rework_count: int
    processed_at: datetime

    class Config:
        from_attributes = True