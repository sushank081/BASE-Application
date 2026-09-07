from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.pack_scan_validation import CellmesAppPackScan, CellmesAppLhrhScanNonmes
from models.module_scan_validation import CellmesAppLhrlScan
from models.leak_test_validation import CellmesAppLeakTest
from models.pre_eol_validation import CellmesAppPreEol
from models.eol_validation import CellmesAppEol
from schemas.pack_review_summary import PackReviewSummaryResponse

router = APIRouter(prefix="/production/pack-review", tags=["Battery History & Data Summary Ledger"])

# =============================================================================
# GET METHOD: PACK SUMMARY HISTORICAL RETRIEVAL
# =============================================================================
@router.get("/summary/{pack_serial}", response_model=PackReviewSummaryResponse)
def get_pack_assembly_summary_history(pack_serial: str, db: Session = Depends(get_db)):
    """
    Retrieves the full multi-station diagnostic history and telemetry footprint 
    for a completed battery pack using its unique serial number via a GET request.
    """
    
    # -------------------------------------------------------------------------
    # RULE 2a: Check whether pack_serial exists in cellmes_app_pack_scan
    # -------------------------------------------------------------------------
    pack_base = (
        db.query(CellmesAppPackScan)
        .filter(CellmesAppPackScan.pack_number == pack_serial)
        .first()
    )

    if not pack_base:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Query Aborted: Pack Serial Identification footprint [{pack_serial}] not found in tracking history."
        )

    # -------------------------------------------------------------------------
    # RULE 2b: Check whether pack_serial exists in previous stage (cellmes_app_eol)
    # -------------------------------------------------------------------------
    eol_metrics = (
        db.query(CellmesAppEol)
        .filter(CellmesAppEol.pack_id == pack_base.id)
        .order_by(CellmesAppEol.id.desc())  # Enforce looking up the latest run
        .first()
    )

    if not eol_metrics:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail=f"Sequence Deviation: Pack Serial '{pack_serial}' has not completed final Chroma End-of-Line testing yet."
        )

    # -------------------------------------------------------------------------
    # RULE 3: Compile multi-station history metrics to construct summary layout response
    # -------------------------------------------------------------------------
    # Fetch module line sub-assembly codes (MES vs Non-MES Mode Fallback)
    lh_serial_val = "UNKNOWN"
    rh_serial_val = "UNKNOWN"

    if pack_base.lh_id is not None:
        # MES MODE: Fetch from cellmes_app_lhrl_scan
        lh_module = (
            db.query(CellmesAppLhrlScan.lh_serial)
            .filter(CellmesAppLhrlScan.id == pack_base.lh_id)
            .first()
        )
        rh_module = (
            db.query(CellmesAppLhrlScan.rh_serial)
            .filter(CellmesAppLhrlScan.id == pack_base.rh_id)
            .first()
        )

        lh_serial_val = lh_module[0] if lh_module else "UNKNOWN"
        rh_serial_val = rh_module[0] if rh_module else "UNKNOWN"

    elif getattr(pack_base, "lhrh_id_nonmes", None) is not None:
        # NON-MES MODE: Fetch from cellmes_app_lhrh_scan_nonmes
        nonmes_record = (
            db.query(CellmesAppLhrhScanNonmes)
            .filter(CellmesAppLhrhScanNonmes.id == pack_base.lhrh_id_nonmes)
            .first()
        )
        if nonmes_record:
            lh_serial_val = nonmes_record.lh_serial or "UNKNOWN"
            rh_serial_val = nonmes_record.rh_serial or "UNKNOWN"

    # Gather diagnostic results from leakage decay sub-ledgers (Fetch the latest scalar value safely)
    leak_record_row = (
        db.query(CellmesAppLeakTest.leak_test_value)
        .filter(CellmesAppLeakTest.pack_id == pack_base.id)
        .order_by(CellmesAppLeakTest.id.desc())
        .first()
    )
    leak_record = leak_record_row[0] if leak_record_row else None

    # Gather diagnostic results from high-voltage Pre-EOL sub-ledgers (Fetch the latest scalar value safely)
    pre_eol_record_row = (
        db.query(CellmesAppPreEol.pre_eol_status)
        .filter(CellmesAppPreEol.pack_id == pack_base.id)
        .order_by(CellmesAppPreEol.id.desc())
        .first()
    )
    pre_eol_record = pre_eol_record_row[0] if pre_eol_record_row else "NO"

    # Flatten and return database metrics inside the updated schema layout
    return PackReviewSummaryResponse(
        lh_serial=lh_serial_val,
        rh_serial=rh_serial_val,
        bms_number=pack_base.bms_number,
        leak_test_value=leak_record,
        pre_eol_status=pre_eol_record,
        inspection_date=eol_metrics.inspection_date,
        start_time=eol_metrics.start_time,
        end_time=eol_metrics.end_time,
        tester_id=eol_metrics.tester_id,
        channel_id=eol_metrics.channel_id,
        cell_deviation=eol_metrics.cell_deviation,
        cell_minimun=eol_metrics.cell_minimun,
        cell_maximum=eol_metrics.cell_maximum,
        pdu_balancing_temp=eol_metrics.pdu_balancing_temp,
        pack_final_voltage=eol_metrics.pack_final_voltage,
        start_soc=eol_metrics.start_soc,
        final_soc=eol_metrics.final_soc,
        dc_dc=eol_metrics.dc_dc,
        pack_temprature=eol_metrics.pack_temprature,
        final_status=eol_metrics.final_status
    )