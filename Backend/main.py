from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.session import engine, Base

from api.v1.cellmes_master_pack_config import router as pack_config_router
from api.v1.cellmes_master_bms_config import router as bms_config_router
from api.v1.cellmes_master_module_config import router as module_config_router
from api.v1.cellmes_master_battery_config import router as battery_config_router
from api.v1.cellmes_master_module_master import router as module_master_router
from api.v1.module_scan_validation import router as scan_engine_router
from api.v1.pack_scan_validation import router as pack_validation_router
from api.v1.leak_test_validation import router as leak_test_router
from api.v1.pre_eol_validation import router as pre_eol_router
from api.v1.eol_validation import router as eol_router
from api.v1.pack_review_summary import router as review_summary_router
from api.v1.pdi_validation import router as pdi_gate_router
from api.v1.nc_clearance import router as nc_clearance_router
from api.v1.module_work_order import router as module_work_order_router
from api.v1.pack_work_order import router as pack_work_order_router
from api.v1.dashboard_analytics import router as dashboard_analytics_router
from api.v1.user_group import router as user_group_router
from api.v1.master_user import router as master_user_router
from api.v1.auth import router as auth_router
from api.v1.genealogy import router as genealogy_router
from api.v1.master_defect import router as master_defect_router
from api.v1.master_defect_source import router as master_defect_source_router
from api.v1.master_battery_status import router as master_battery_status_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Cell-MES Backend",
    description="MES System Application for Battery Production",
    version="1.0.0"
)

origins = [
    "http://localhost:3000",    
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

app.include_router(pack_config_router, prefix="/api/v1")
app.include_router(bms_config_router, prefix="/api/v1")
app.include_router(module_config_router, prefix="/api/v1")
app.include_router(battery_config_router, prefix="/api/v1")
app.include_router(module_master_router, prefix="/api/v1")
app.include_router(scan_engine_router, prefix="/api/v1")
app.include_router(pack_validation_router, prefix="/api/v1")
app.include_router(leak_test_router, prefix="/api/v1")
app.include_router(pre_eol_router, prefix="/api/v1")
app.include_router(eol_router, prefix="/api/v1")
app.include_router(review_summary_router, prefix="/api/v1")
app.include_router(pdi_gate_router, prefix="/api/v1")
app.include_router(nc_clearance_router, prefix="/api/v1")
app.include_router(module_work_order_router, prefix="/api/v1")
app.include_router(pack_work_order_router, prefix="/api/v1")
app.include_router(dashboard_analytics_router, prefix="/api/v1")
app.include_router(user_group_router, prefix="/api/v1")
app.include_router(master_user_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(genealogy_router, prefix="/api/v1")
app.include_router(master_defect_router, prefix="/api/v1")
app.include_router(master_defect_source_router, prefix="/api/v1")
app.include_router(master_battery_status_router, prefix="/api/v1")



@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "online", 
        "project": "Cell-MES",
        "database": "CELLMES connected"
    }