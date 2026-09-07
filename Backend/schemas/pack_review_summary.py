from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field

class PackReviewSummaryPayload(BaseModel):
    pack_serial: str = Field(..., max_length=52, json_schema_extra={"example": "BB00000004655.B.000000HS01.G.177.1.1.B2PJCB26FG4079"})

class PackReviewSummaryResponse(BaseModel):
    # Module Line Details
    lh_serial: str
    rh_serial: str
    
    # Pack Line Details
    bms_number: str
    
    # Leak Test Details
    leak_test_value: Optional[int] = None
    
    # Pre-EOL Details
    pre_eol_status: str
    
    # Chroma EOL Machine Details (Updated to align with cellmes_app_eol schema)
    inspection_date: Optional[datetime] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    tester_id: Optional[str] = None
    channel_id: Optional[str] = None
    cell_deviation: Optional[str] = None
    cell_minimun: Optional[str] = None
    cell_maximum: Optional[str] = None
    pdu_balancing_temp: Optional[str] = None
    pack_final_voltage: Optional[str] = None
    start_soc: Optional[str] = None
    final_soc: Optional[str] = None
    dc_dc: Optional[str] = None
    pack_temprature: Optional[str] = None
    final_status: Optional[str] = None

    class Config:
        from_attributes = True