from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field

# ==========================================
# OPERATION 1: CHROMA START SCHEMAS
# ==========================================
class BCTCheckStatusRequest(BaseModel):
    BatteryPackSr: str
    ChannelID: str
    MachineID: str

class BCTCheckStatusContainer(BaseModel):
    Request: BCTCheckStatusRequest

class ChromaStartPayload(BaseModel):
    OLA_BCTCheckStatus: BCTCheckStatusContainer

class ErrorDetailBlock(BaseModel):
    ErrorCode: Optional[int] = None
    ErrorMessage: Optional[str] = None

class ChromaStartResponse(BaseModel):
    odata_context: str = Field(
        "https://prod-mes-nlb.olaplant.com/sit-svc/application/AppU4DM/odata/$metadata#OLA.AppU4DM.ExtApp4Battery.BLPOMModel.Commands.ExtApp4Battery_BCTCheckStatusResponse", 
        serialization_alias="@odata.context"
    )
    Succeeded: bool
    PackSerialNumber: str
    Result: str
    Error: ErrorDetailBlock
    SitUafExecutionDetail: str

    class Config:
        populate_by_name = True


# ==========================================
# OPERATION 2: CHROMA COMPLETE SCHEMAS
# ==========================================
class BCTTestResultRequest(BaseModel):
    BatteryPackSr: str
    InspectionDate: Optional[date] = Field(None, alias="InspectionDate")
    TesterID: Optional[str] = Field(None, alias="TesterID")
    ChannelID: Optional[str] = Field(None, alias="ChannelID")
    CellDeviation: Optional[str] = Field(None, alias="Cell Deviation")
    CellMinimum: Optional[str] = Field(None, alias="Cell Minimum")
    PduBalancingTemp: Optional[str] = Field(None, alias="Temperature difference of PDU- Balancing ")
    PackFinalVoltage: Optional[str] = Field(None, alias="Final Pack Voltage ")
    FinalSoc: Optional[str] = Field(None, alias="Final SOC%")
    DcDc: Optional[str] = Field(None, alias="BMS DC DC Voltage ")
    CellMaximum: Optional[str] = Field(None, alias="Cell Maximum")
    StartSoc: Optional[str] = Field(None, alias="Start SOC %")
    PackTemperature: Optional[str] = Field(None, alias="Battery Pack Temperature ")
    FinalStatus: str = Field(..., alias="FinalStatus")
    StartTime: Optional[str] = Field(None, alias="Start_time")
    EndTime: Optional[str] = Field(None, alias="End_time")

    class Config:
        populate_by_name = True


class BCTTestResultContainer(BaseModel):
    Request: BCTTestResultRequest


class ChromaCompletePayload(BaseModel):
    OLA_BCTTestResult: BCTTestResultContainer


class ChromaCompleteResponse(BaseModel):
    odata_context: str = Field(
        "https://prod-mes-nlb.olaplant.com/sit-svc/application/AppU4DM/odata/$metadata#OLA.AppU4DM.ExtApp4Battery.BLPOMModel.Commands.ExtApp4Battery_CreateBPTResultResponse", 
        serialization_alias="@odata.context"
    )
    Succeeded: bool
    Error: ErrorDetailBlock
    SitUafExecutionDetail: str

    class Config:
        populate_by_name = True