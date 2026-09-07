from typing import Dict, List
from pydantic import BaseModel

class MaterialCountItem(BaseModel):
    material_number: str
    count: int

class ModuleLineBreakdown(BaseModel):
    fresh_by_material: List[MaterialCountItem]
    completed_by_material: List[MaterialCountItem]

class ModuleDashboardAnalyticsResponse(BaseModel):
    total_fresh_module_wos: int
    total_completed_module_wos: int
    line_1: ModuleLineBreakdown
    line_2: ModuleLineBreakdown

class PackDashboardAnalyticsResponse(BaseModel):
    total_fresh_pack_wos: int
    total_started_pack_wos: int
    total_hold_pack_wos: int
    started_by_material: List[MaterialCountItem]
    completed_by_material: List[MaterialCountItem]

class ComprehensiveDashboardResponse(BaseModel):
    modules: ModuleDashboardAnalyticsResponse
    packs: PackDashboardAnalyticsResponse