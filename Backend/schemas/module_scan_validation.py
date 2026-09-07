from datetime import datetime
from pydantic import BaseModel, Field

class ModuleScanValidationPayload(BaseModel):
    lh_serial: str = Field(..., min_length=1, max_length=12, json_schema_extra={"example": "3L1234567890"})
    rh_serial: str = Field(..., min_length=1, max_length=12, json_schema_extra={"example": "3L9876543210"})
    line_id: int = Field(..., description="Production Line Identifier (1 or 2)", json_schema_extra={"example": 1})

class ModuleScanValidationResponse(BaseModel):
    status: str
    message: str
    scan_record_id: int
    matched_wo_number: str
    updated_wo_status: str
    module_serial: str = Field(..., description="Generated Module Serial") # Key field name here
    processed_at: datetime

    class Config:
        from_attributes = True