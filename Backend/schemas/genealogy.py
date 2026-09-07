from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel


# 1. Station Data Schemas
class PackLineGenealogy(BaseModel):
    lh_serial: Optional[str] = None
    rh_serial: Optional[str] = None
    bms_number: Optional[str] = None
    overall_status: Optional[str] = None
    created_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeakTestGenealogy(BaseModel):
    leak_test_value: Optional[float] = None
    leak_test_result: Optional[str] = None
    test_start_time: Optional[datetime] = None

    class Config:
        from_attributes = True


class PreEolGenealogy(BaseModel):
    pre_eol_status: Optional[str] = None
    category: Optional[str] = None
    remarks: Optional[str] = None
    created_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class EolGenealogy(BaseModel):
    inspection_date: Optional[date] = None
    tester_id: Optional[str] = None
    cell_deviation: Optional[float] = None
    cell_minimun: Optional[float] = None
    pdu_balancing_temp: Optional[float] = None
    pack_final_voltage: Optional[float] = None
    final_soc: Optional[float] = None
    dc_dc: Optional[float] = None
    cell_maximum: Optional[float] = None
    start_soc: Optional[float] = None
    pack_temprature: Optional[float] = None
    final_status: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    class Config:
        from_attributes = True


class PdiGenealogy(BaseModel):
    pdi: Optional[str] = None  # PDI Column from cellmes_app_pdi_station
    leak_test_status: Optional[str] = None
    pre_eol_status: Optional[str] = None
    chroma_test: Optional[str] = None
    defect_name: Optional[str] = None
    pdi_remarks: Optional[str] = None
    pack_status: Optional[str] = None
    defect_source: Optional[str] = None
    rework_count: Optional[int] = None
    is_reworked: Optional[int] = None
    created_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# 2. Master Genealogy Aggregator Response Schema
class PackGenealogyResponse(BaseModel):
    pack_serial: str
    pack_id: int
    pack_line: Optional[PackLineGenealogy] = None
    leak_test: List[LeakTestGenealogy] = []
    pre_eol: List[PreEolGenealogy] = []
    eol: List[EolGenealogy] = []
    pdi: List[PdiGenealogy] = []