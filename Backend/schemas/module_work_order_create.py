from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator

class ModuleWorkOrderCreatePayload(BaseModel):
    wo_number: str = Field(..., max_length=24)
    po_number: str = Field(..., max_length=24)
    material_number: str = Field(..., max_length=24)
    part_name: str = Field(..., max_length=80)
    bop_id: str = Field(..., max_length=10)
    work_station: str = Field(..., max_length=16)
    status: str = Field(..., max_length=50)
    schedule_time: Optional[datetime] = None
    job_end_time: Optional[datetime] = None
    created_on: Optional[datetime] = None
    updated_on: Optional[datetime] = None
    vendor_line_payload: Literal["PARI", "RUHLAMAT"]

    # =============================================================================
    # CUSTOM INTERCEPT HOOKS: CLEAN UP AND SANITIZE DIVERGENT ISO STRINGS
    # =============================================================================
    @field_validator("schedule_time", "job_end_time", "created_on", "updated_on", mode="before")
    @classmethod
    def clean_iso_timestamp_tokens(cls, value):
        if not value:
            return None
            
        if isinstance(value, str):
            # Normalize whitespace separator to modern standard 'T' format
            sanitized = value.strip().replace(" ", "T")
            
            # Handle standard trailing '+00' formatting anomalies natively
            if sanitized.endswith("+00"):
                sanitized += ":00"
                
            try:
                # Attempt to parse the cleaned variant string
                return datetime.fromisoformat(sanitized)
            except ValueError:
                # Fallback to general time engine configuration rules
                pass
                
        return value

    class Config:
        from_attributes = True