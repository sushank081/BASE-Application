from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class LeakTestValidationPayload(BaseModel):
    pack_serial: str = Field(..., max_length=52, json_schema_extra={"example": "BB00000004655.B.000000HS01.G.177.1.1.B2PJCB26FG4079"})
    leak_test_value: int = Field(..., description="Pressure decay delta numerical metric", json_schema_extra={"example": 3})
    status: str = Field(..., max_length=10, description="PASS or FAIL diagnostic verdict", json_schema_extra={"example": "PASS"})

class LeakTestValidationResponse(BaseModel):
    status: str
    message: str
    leak_test_id: int
    matched_pack_id: int
    saved_result: str
    logged_at: datetime

    class Config:
        from_attributes = True