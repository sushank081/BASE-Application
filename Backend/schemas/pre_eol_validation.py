from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# =============================================================================
# INCOMING REQUEST PAYLOAD TEMPLATE (UPDATED KEY STRUCTURE)
# =============================================================================
class PreEolValidationPayload(BaseModel):
    BatteryPackNumber: str = Field(
        ..., 
        max_length=52, 
        json_schema_extra={"example": "BB00000004655.B.000000HS01.G.177.1.1.B2PJCB26FG4079"},
        description="The physical barcode scanned from the battery pack casing envelope"
    )
    Status: str = Field(
        ..., 
        max_length=10, 
        description="PASS or FAIL electrical testing verdict input segment", 
        json_schema_extra={"example": "PASS"}
    )
    ErrorInformation: Optional[str] = Field(
        None, 
        max_length=150,  # Expanded slightly to safely map against your 150-char clearance remarks schema
        description="Optional detailed machine diagnostic code error string payload parameters", 
        json_schema_extra={"example": "Nominal continuity verified"}
    )
    FailReason: Optional[str] = Field(
        None, 
        max_length=50, 
        description="Optional diagnostic classification subclass failure mode descriptor token", 
        json_schema_extra={"example": "Hi-Pot Test"}
    )


# =============================================================================
# OUTGOING RESPONSE INTERFACE DTO
# =============================================================================
class PreEolValidationResponse(BaseModel):
    status: str
    message: str
    pre_eol_record_id: int
    matched_pack_id: int
    saved_status: str
    processed_at: datetime

    class Config:
        from_attributes = True