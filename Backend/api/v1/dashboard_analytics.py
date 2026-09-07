from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.session import get_db
from models.module_scan_validation import CellmessAppModuleWo
from models.pack_scan_validation import CellmesAppPackWo
from schemas.dashboard_analytics import (
    ComprehensiveDashboardResponse,
    ModuleDashboardAnalyticsResponse,
    PackDashboardAnalyticsResponse,
    ModuleLineBreakdown,
    MaterialCountItem
)

router = APIRouter(prefix="/production/dashboard-analytics", tags=["Shop Floor KPI Metrics Engine"])

def get_module_material_counts(db: Session, line_id: int, status_val: str, wo_used_val: int = None):
    """Helper method to fetch clean material group aggregates for Module tables."""
    # Define a clean shared target evaluation mapping expression
    mat_expr = func.coalesce(func.nullif(func.trim(CellmessAppModuleWo.material_number), ''), 'UNKNOWN')
    
    query = db.query(
        mat_expr.label("mat_num"),
        func.count(CellmessAppModuleWo.id)
    ).filter(CellmessAppModuleWo.line_id == line_id, CellmessAppModuleWo.status == status_val)
    
    if wo_used_val is not None:
        query = query.filter(CellmessAppModuleWo.wo_used == wo_used_val)
        
    # Group by the exact conditional logic block mapping format for PostgreSQL compatibility
    records = query.group_by(mat_expr).all()
    return [MaterialCountItem(material_number=r[0], count=r[1]) for r in records]

def get_pack_material_counts(db: Session, status_list: list):
    """Helper method to fetch clean material group aggregates for Pack tables."""
    mat_expr = func.coalesce(func.nullif(func.trim(CellmesAppPackWo.material_number), ''), 'UNKNOWN')
    
    records = db.query(
        mat_expr.label("mat_num"),
        func.count(CellmesAppPackWo.id)
    ).filter(CellmesAppPackWo.wo_status.in_(status_list)).group_by(mat_expr).all()
    
    return [MaterialCountItem(material_number=r[0], count=r[1]) for r in records]

# =============================================================================
# GET METHOD: AGGREGATE CORE KPI TELEMETRY DATA FOR SHOP FLOOR MONITORING
# =============================================================================
@router.get("/", response_model=ComprehensiveDashboardResponse, status_code=status.HTTP_200_OK)
def get_comprehensive_dashboard_telemetry(db: Session = Depends(get_db)):
    """
    Computes factory-wide real-time KPIs for both Module and Pack manufacturing streams, 
    including complete material breakdown indices, optimized for dashboard telemetry graphs.
    """
    
    # -------------------------------------------------------------------------
    # PART 1: MODULE MANUFACTURING TELEMETRY CALCULATIONS
    # -------------------------------------------------------------------------
    total_fresh_modules = db.query(CellmessAppModuleWo).filter(
        CellmessAppModuleWo.status == "SCHEDULED", 
        CellmessAppModuleWo.wo_used == 0
    ).count()
    
    total_completed_modules = db.query(CellmessAppModuleWo).filter(
        CellmessAppModuleWo.status == "COMPLETED"
    ).count()

    modules_analytics = ModuleDashboardAnalyticsResponse(
        total_fresh_module_wos=total_fresh_modules,
        total_completed_module_wos=total_completed_modules,
        line_1=ModuleLineBreakdown(
            fresh_by_material=get_module_material_counts(db, line_id=1, status_val="SCHEDULED", wo_used_val=0),
            completed_by_material=get_module_material_counts(db, line_id=1, status_val="COMPLETED")
        ),
        line_2=ModuleLineBreakdown(
            fresh_by_material=get_module_material_counts(db, line_id=2, status_val="SCHEDULED", wo_used_val=0),
            completed_by_material=get_module_material_counts(db, line_id=2, status_val="COMPLETED")
        )
    )

    # -------------------------------------------------------------------------
    # PART 2: BATTERY PACK ASSEMBLY LINE TELEMETRY CALCULATIONS
    # -------------------------------------------------------------------------
    total_fresh_packs = db.query(CellmesAppPackWo).filter(CellmesAppPackWo.wo_status == "SCHEDULED").count()
    total_started_packs = db.query(CellmesAppPackWo).filter(CellmesAppPackWo.wo_status.in_(["STARTED", "REWORKED"])).count()
    total_hold_packs = db.query(CellmesAppPackWo).filter(CellmesAppPackWo.wo_status == "HOLD").count()

    packs_analytics = PackDashboardAnalyticsResponse(
        total_fresh_pack_wos=total_fresh_packs,
        total_started_pack_wos=total_started_packs,
        total_hold_pack_wos=total_hold_packs,
        started_by_material=get_pack_material_counts(db, ["STARTED", "REWORKED"]),
        completed_by_material=get_pack_material_counts(db, ["COMPLETED"])
    )

    return ComprehensiveDashboardResponse(
        modules=modules_analytics,
        packs=packs_analytics
    )