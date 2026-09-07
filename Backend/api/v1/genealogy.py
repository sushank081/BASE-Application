from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.pack_scan_validation import (
    CellmesAppPackScan, 
    CellmesAppLhrhScanNonmes
)
from models.module_scan_validation import CellmesAppLhrlScan
from models.leak_test_validation import CellmesAppLeakTest
from models.pre_eol_validation import CellmesAppPreEol
from models.eol_validation import CellmesAppEol
from models.pdi_validation import CellmesAppPdiStation
from schemas.genealogy import (
    PackGenealogyResponse,
    PackLineGenealogy,
    LeakTestGenealogy,
    PreEolGenealogy,
    EolGenealogy,
    PdiGenealogy
)

router = APIRouter(prefix="/production/genealogy", tags=["Battery Pack Genealogy Engine"])


@router.get("/pack/{pack_serial}", response_model=PackGenealogyResponse)
def get_pack_genealogy(pack_serial: str, db: Session = Depends(get_db)):
    """
    Retrieves full station-by-station genealogy (traceability) records 
    for a given battery pack serial number. Supports partial serial search via LIKE query.
    Resolves LH/RH serial numbers from both MES (cellmes_app_lhrl_scan) 
    and Non-MES (cellmes_app_lhrh_scan_nonmes) tables.
    """
    clean_serial = pack_serial.strip()

    # 1. Fetch Primary Master Pack Scan Record using SQL LIKE search
    registered_pack = (
        db.query(CellmesAppPackScan)
        .filter(CellmesAppPackScan.pack_number.like(f"%{clean_serial}%"))
        .order_by(CellmesAppPackScan.id.desc())
        .first()
    )

    if not registered_pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pack Serial matching pattern '{clean_serial}' not found in master registration records."
        )

    pack_id = registered_pack.id
    resolved_full_serial = registered_pack.pack_number

    # 2. Resolve LH and RH serials dynamically (MES vs Non-MES Mode Fallback)
    lh_id = getattr(registered_pack, "lh_id", None)
    rh_id = getattr(registered_pack, "rh_id", None)
    lhrh_id_nonmes = getattr(registered_pack, "lhrh_id_nonmes", None)

    lh_serial_val = None
    rh_serial_val = None

    if lh_id is not None:
        # ---------------------------------------------------------------------
        # MES MODE: Resolve from cellmes_app_lhrl_scan
        # ---------------------------------------------------------------------
        lh_record = db.query(CellmesAppLhrlScan).filter(CellmesAppLhrlScan.id == lh_id).first()
        rh_record = db.query(CellmesAppLhrlScan).filter(CellmesAppLhrlScan.id == rh_id).first()

        lh_serial_val = (
            getattr(lh_record, "lh_serial", None) or getattr(lh_record, "serial_number", None)
            if lh_record else None
        )
        rh_serial_val = (
            getattr(rh_record, "rh_serial", None) or getattr(rh_record, "serial_number", None)
            if rh_record else None
        )

    elif lhrh_id_nonmes is not None:
        # ---------------------------------------------------------------------
        # NON-MES MODE: Resolve from cellmes_app_lhrh_scan_nonmes
        # ---------------------------------------------------------------------
        nonmes_record = (
            db.query(CellmesAppLhrhScanNonmes)
            .filter(CellmesAppLhrhScanNonmes.id == lhrh_id_nonmes)
            .first()
        )
        if nonmes_record:
            lh_serial_val = getattr(nonmes_record, "lh_serial", None)
            rh_serial_val = getattr(nonmes_record, "rh_serial", None)

    # 3. Query Station Records
    leak_test_records = (
        db.query(CellmesAppLeakTest)
        .filter(CellmesAppLeakTest.pack_id == pack_id)
        .order_by(CellmesAppLeakTest.id.asc())
        .all()
    )

    pre_eol_records = (
        db.query(CellmesAppPreEol)
        .filter(CellmesAppPreEol.pack_id == pack_id)
        .order_by(CellmesAppPreEol.id.asc())
        .all()
    )

    eol_records = (
        db.query(CellmesAppEol)
        .filter(CellmesAppEol.pack_id == pack_id)
        .order_by(CellmesAppEol.id.asc())
        .all()
    )

    pdi_records = (
        db.query(CellmesAppPdiStation)
        .filter(CellmesAppPdiStation.pack_id == pack_id)
        .order_by(CellmesAppPdiStation.id.asc())
        .all()
    )

    # 4. Construct Output Payloads
    pack_line_data = PackLineGenealogy(
        lh_serial=lh_serial_val,
        rh_serial=rh_serial_val,
        bms_number=getattr(registered_pack, "bms_number", None),
        overall_status=getattr(registered_pack, "overall_status", None),
        created_date=getattr(registered_pack, "created_date", None)
    )

    # Format PDI list safely checking mapped attributes
    formatted_pdi_list = []
    for rec in pdi_records:
        pdi_value = getattr(rec, "pdi", None) or getattr(rec, "PDI", None)
        
        formatted_pdi_list.append(
            PdiGenealogy(
                pdi=pdi_value,
                leak_test_status=rec.leak_test_status,
                pre_eol_status=rec.pre_eol_status,
                chroma_test=rec.chroma_test,
                defect_name=rec.defect_name,
                pdi_remarks=rec.pdi_remarks,
                pack_status=rec.pack_status,
                defect_source=rec.defect_source,
                rework_count=rec.rework_count,
                is_reworked=rec.is_reworked,
                created_date=rec.created_date
            )
        )

    return PackGenealogyResponse(
        pack_serial=resolved_full_serial,
        pack_id=pack_id,
        pack_line=pack_line_data,
        leak_test=[LeakTestGenealogy.model_validate(rec) for rec in leak_test_records],
        pre_eol=[PreEolGenealogy.model_validate(rec) for rec in pre_eol_records],
        eol=[EolGenealogy.model_validate(rec) for rec in eol_records],
        pdi=formatted_pdi_list
    )