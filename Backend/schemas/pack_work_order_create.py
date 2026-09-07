from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

class PackWorkOrderCreatePayload(BaseModel):
    wo_number: str = Field(..., max_length=24)
    po_number: str = Field(..., max_length=24)
    schedule_time: Optional[datetime] = None
    wo_status: str = Field(..., max_length=50)
    work_station: Optional[str] = Field(None, max_length=16)
    created_on: Optional[datetime] = None
    order_type: Optional[str] = Field(None, max_length=16)
    material_number: Optional[str] = Field(None, max_length=24)
    bop_id: Optional[str] = Field(None, max_length=24)
    part_name: Optional[str] = Field(None, max_length=80)

    # =============================================================================
    # CUSTOM INTERCEPT HOOKS: CLEAN UP AND SANITIZE DIVERGENT ISO STRINGS
    # =============================================================================
    @field_validator("schedule_time", "created_on", mode="before")
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