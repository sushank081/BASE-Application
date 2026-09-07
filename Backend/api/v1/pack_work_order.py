from typing import List, Optional
from datetime import date, datetime, time
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from db.session import get_db
from models.pack_scan_validation import CellmesAppPackWo
from schemas.pack_work_order import PackWorkOrderResponse
from schemas.pack_work_order_create import PackWorkOrderCreatePayload

router = APIRouter(prefix="/production/pack-work-orders", tags=["Battery Pack Work Orders Ledger"])

# =============================================================================
# 1. GET METHOD: RETRIEVE ALL PACK WORK ORDERS (WITH TEMPORAL & STRING FILTERS)
# =============================================================================
@router.get("/", response_model=List[PackWorkOrderResponse], status_code=status.HTTP_200_OK)
def get_all_pack_work_orders(
    start_date: Optional[date] = Query(None, description="Filter records created on or after date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter records created on or before date (YYYY-MM-DD)"),
    material_number: Optional[str] = Query(None, description="Search material number parameter string"),
    status: Optional[str] = Query(None, description="Filter by status configuration (SCHEDULED, COMPLETED)"),
    db: Session = Depends(get_db)
):
    """
    Retrieves all columns from the cellmes_app_pack_wo table, sorted in ascending order 
    by their unique tracking ID with real-time multi-column server-side filtering.
    """
    query = db.query(CellmesAppPackWo)

    # Apply Start Date Filter (Midnight Boundary check)
    if start_date:
        start_datetime = datetime.combine(start_date, time.min)
        query = query.filter(CellmesAppPackWo.start_time >= start_datetime)

    # Apply End Date Filter (End of Day Boundary check)
    if end_date:
        end_datetime = datetime.combine(end_date, time.max)
        query = query.filter(CellmesAppPackWo.start_time <= end_datetime)

    # Apply Material Number Substring Search
    if material_number and material_number.strip():
        query = query.filter(CellmesAppPackWo.material_number.ilike(f"%{material_number.strip()}%"))

    # Apply Status Condition Matching
    if status and status.strip():
        query = query.filter(CellmesAppPackWo.wo_status == status.strip())

    # Execute and return rows matching Module Line sequencing styles
    results = query.order_by(CellmesAppPackWo.id.asc()).all()
    return results


# =============================================================================
# 2. POST METHOD: CREATE A NEW BATTERY PACK WORK ORDER ENTRY
# =============================================================================
@router.post("/", response_model=PackWorkOrderResponse, status_code=status.HTTP_201_CREATED)
def create_pack_work_order(
    payload: PackWorkOrderCreatePayload, 
    db: Session = Depends(get_db)
):
    """
    Inserts a fresh target planning schedule entry inside the cellmes_app_pack_wo database ledger.
    Fields like start_time (CURRENT_TIMESTAMP) and wo_used (0) are managed explicitly by the db engine layers.
    """
    
    # Verification Rule: Prevent duplicate scheduling of the exact same Work Order code
    duplicate_wo = db.query(CellmesAppPackWo).filter(
        CellmesAppPackWo.wo_number == payload.wo_number.strip()
    ).first()
    
    if duplicate_wo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Scheduling Conflict: Work Order code [{payload.wo_number}] already exists in tracking registers."
        )

    # Database model instantiation mapping schema values explicitly
    new_pack_wo = CellmesAppPackWo(
        wo_number=payload.wo_number.strip(),
        po_number=payload.po_number.strip(),
        schedule_time=payload.schedule_time,
        wo_status=payload.wo_status.strip(),
        work_station=payload.work_station.strip() if payload.work_station else None,
        created_on=payload.created_on if payload.created_on else datetime.now(),
        order_type=payload.order_type.strip() if payload.order_type else None,
        material_number=payload.material_number.strip() if payload.material_number else None,
        bop_id=payload.bop_id.strip() if payload.bop_id else None,
        part_name=payload.part_name.strip() if payload.part_name else None,
        
        # Explicit initialization parameters adhering to standard DDL definitions
        wo_used=0 
    )

    try:
        db.add(new_pack_wo)
        db.commit()
        db.refresh(new_pack_wo)
        return new_pack_wo
        
    except Exception as transaction_err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"System Transaction Exception: Aborted creation sequence. Technical details: {str(transaction_err)}"
        )