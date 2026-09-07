from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict


class PackScanValidationPayload(BaseModel):
    mode: Literal['A', 'M'] = Field(
        ...,
        description="Operation Mode: 'A' for Automated (MES), 'M' for Manual (Non-MES)",
        json_schema_extra={"example": "A"}
    )
    lh_serial: str = Field(
        ...,
        max_length=20,
        description="Left-Hand Module Serial Number",
        json_schema_extra={"example": "M2L10000000000000001"}
    )
    rh_serial: str = Field(
        ...,
        max_length=20,
        description="Right-Hand Module Serial Number",
        json_schema_extra={"example": "M2R10000000000000002"}
    )
    pack_serial: str = Field(
        ...,
        max_length=52,
        description="Pack Enclosure Serial Number (52 characters)",
        json_schema_extra={"example": "BB000000004655.B.000000HS01.G.208.1.1.B2PJCB27GG4391"}
    )
    bms_serial: str = Field(
        ...,
        max_length=74,
        description="BMS Hardware Serial Number (67 characters)",
        json_schema_extra={"example": "BB000000004621.B.1000000057.6.185.8C.01.03368.00-00-00.3.1.4.A.66-12-51-B"}
    )


class PackScanValidationResponse(BaseModel):
    status: str
    message: str
    mode: str
    pack_scan_record_id: int
    linked_wo_number: str
    extracted_pack_material_id: str
    lhrh_id_nonmes: Optional[int] = None
    processed_at: datetime

    model_config = ConfigDict(from_attributes=True)