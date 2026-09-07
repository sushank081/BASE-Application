from typing import List, Optional
from datetime import date, datetime, time
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from db.session import get_db
from models.module_scan_validation import CellmessAppModuleWo
from schemas.module_work_order import ModuleWorkOrderResponse
from schemas.module_work_order_create import ModuleWorkOrderCreatePayload

# Instantiating the specialized module work order endpoint router
router = APIRouter(prefix="/production/module-work-orders", tags=["Module Work Orders Ledger"])

# =============================================================================
# 1. GET METHOD: RETRIEVE ALL MODULE WORK ORDERS (WITH TEMPORAL & STRING FILTERS)
# =============================================================================
@router.get("/", response_model=List[ModuleWorkOrderResponse], status_code=status.HTTP_200_OK)
def get_all_module_work_orders(
    start_date: Optional[date] = Query(None, description="Filter records created on or after date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter records created on or before date (YYYY-MM-DD)"),
    material_number: Optional[str] = Query(None, description="Search material number pattern"),
    status: Optional[str] = Query(None, description="Filter by status (SCHEDULED, COMPLETED, NEW, STARTED)"),
    db: Session = Depends(get_db)
):
    """
    Retrieves all records from the cellmess_app_module_wo table, sorted sequentially 
    by their unique tracking ID in ascending order with real-time multi-column server-side filtering.
    """
    query = db.query(CellmessAppModuleWo)

    # Apply Start Date Filter (Midnight Boundary check)
    if start_date:
        start_datetime = datetime.combine(start_date, time.min)
        query = query.filter(CellmessAppModuleWo.created_on >= start_datetime)

    # Apply End Date Filter (End of Day Boundary check)
    if end_date:
        end_datetime = datetime.combine(end_date, time.max)
        query = query.filter(CellmessAppModuleWo.created_on <= end_datetime)

    # Apply Material Number Substring Search
    if material_number and material_number.strip():
        query = query.filter(CellmessAppModuleWo.material_number.ilike(f"%{material_number.strip()}%"))

    # Apply Status Filter Condition Matching
    if status and status.strip():
        query = query.filter(CellmessAppModuleWo.status == status.strip())

    # Execute and return rows matching Module Line sequencing styles
    results = query.order_by(CellmessAppModuleWo.id.asc()).all()
    return results


# =============================================================================
# 2. POST METHOD: CREATE A NEW MODULE ASSEMBLY WORK ORDER RECORD
# =============================================================================
@router.post("/", response_model=ModuleWorkOrderResponse, status_code=status.HTTP_201_CREATED)
def create_module_work_order(
    payload: ModuleWorkOrderCreatePayload, 
    db: Session = Depends(get_db)
):
    """
    Inserts a module line tracking work order schedule inside the cellmess_app_module_wo ledger.
    Applies floor execution line maps: If payload is PARI, line_id = 1. If payload is RUHLAMAT, line_id = 2.
    """
    
    # 1. Duplication Prevention Rule Check
    duplicate_check = db.query(CellmessAppModuleWo).filter(
        CellmessAppModuleWo.wo_number == payload.wo_number.strip()
    ).first()
    
    if duplicate_check:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Scheduling Fault: Module Work Order code [{payload.wo_number}] already exists in records."
        )

    # 2. Dynamic Evaluator Condition: Compute internal line_id from vendor payload
    computed_line_id = None
    vendor_token = payload.vendor_line_payload.strip().upper()
    
    if vendor_token == "PARI":
        computed_line_id = 1
    elif vendor_token == "RUHLAMAT":
        computed_line_id = 2
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Configuration Error: Invalid vendor line profile target specified: '{payload.vendor_line_payload}'."
        )

    # 3. Structural mapping assignment targeting SQLAlchemy data layer properties
    new_module_wo = CellmessAppModuleWo(
        wo_number=payload.wo_number.strip(),
        po_number=payload.po_number.strip(),
        material_number=payload.material_number.strip(),
        part_name=payload.part_name.strip(),
        bop_id=payload.bop_id.strip(),
        work_station=payload.work_station.strip(),
        status=payload.status.strip(),
        schedule_time=payload.schedule_time,
        job_end_time=payload.job_end_time,
        created_on=payload.created_on if payload.created_on else datetime.now(),
        updated_on=payload.updated_on,
        
        # Explicit evaluation values processed via conditional layout maps
        line_id=computed_line_id,
        wo_used=0  # Managed explicitly as unconsumed until initial scan steps take place
    )

    try:
        db.add(new_module_wo)
        db.commit()
        db.refresh(new_module_wo)
        return new_module_wo
        
    except Exception as db_transaction_err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Shop Floor Exception: Aborted creation sequence transaction block. Details: {str(db_transaction_err)}"
        )