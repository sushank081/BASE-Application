from datetime import datetime
from typing import Optional, Union
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.session import get_db
from models.pack_scan_validation import CellmesAppPackScan, CellmesAppPackWo
from models.pre_eol_validation import CellmesAppPreEol
from models.eol_validation import CellmesAppEol
from models.nc_clearance import CellmesAppNcClearance
from schemas.eol_validation import (
    ChromaStartPayload, ChromaStartResponse, ErrorDetailBlock,
    ChromaCompletePayload, ChromaCompleteResponse
)

router = APIRouter(prefix="/production/eol", tags=["Battery End-Of-Line (Chroma Test) Engine"])


def parse_chroma_timestamp(ts_val: Optional[Union[datetime, str]]) -> Optional[datetime]:
    """Helper to parse custom Chroma string timestamps into Datetime objects."""
    if not ts_val:
        return None
    if isinstance(ts_val, datetime):
        return ts_val

    clean_str = str(ts_val).strip()
    if "," in clean_str:
        try:
            return datetime.strptime(clean_str, "%Y-%m-%d,%H:%M:%S")
        except ValueError:
            pass

    try:
        return datetime.fromisoformat(clean_str.replace(" ", "T"))
    except ValueError:
        return None


# =============================================================================
# OPERATION 1: CHROMA START (MACHINE GATING INTERLOCK ENGINE)
# =============================================================================
@router.post("/chroma-start", response_model=ChromaStartResponse)
def chroma_start_interlock(payload: ChromaStartPayload, db: Session = Depends(get_db)):
    req_data = payload.OLA_BCTCheckStatus.Request
    serial = req_data.BatteryPackSr

    registered_pack = db.query(CellmesAppPackScan).filter(CellmesAppPackScan.pack_number == serial).first()

    # Helper function to generate standardized machine error response payloads
    def make_fail_response(reason: str, code: int = 400) -> ChromaStartResponse:
        if registered_pack and registered_pack.chroma_status != "OK":
            registered_pack.chroma_status = "NOK"
            db.commit()

        return ChromaStartResponse(
            Succeeded=False,
            PackSerialNumber=serial,
            Result="FAIL",
            Error=ErrorDetailBlock(ErrorCode=code, ErrorMessage=f"ERR_{code}"),
            SitUafExecutionDetail=reason
        )

    # -------------------------------------------------------------------------
    # VALIDATION 1: Verify existence of pack_serial in cellmes_app_pack_scan
    # -------------------------------------------------------------------------
    if not registered_pack:
        return make_fail_response(
            "Sequence Deviation Error: Pack Serial number could not be found in structural registration records.", 
            code=404
        )

    # -------------------------------------------------------------------------
    # VALIDATION 2: Work Order Status & Non-Conformance Clearance Check
    # -------------------------------------------------------------------------
    active_wo = db.query(CellmesAppPackWo).filter(CellmesAppPackWo.id == registered_pack.wo_id).first()
    if not active_wo:
        return make_fail_response(
            "System Error: Linked Work Order context not found for this battery pack configuration.", 
            code=404
        )

    if active_wo.wo_status == "HOLD":
        # Check latest NC ticket for this pack_serial specifically at station_id = 'EOL'
        latest_nc = (
            db.query(CellmesAppNcClearance)
            .filter(
                CellmesAppNcClearance.pack_serial == serial,
                CellmesAppNcClearance.station_id == "EOL"
            )
            .order_by(CellmesAppNcClearance.id.desc())
            .first()
        )

        if latest_nc and latest_nc.nc_cleared == "YES":
            # Update wo_status to REWORKED
            active_wo.wo_status = "REWORKED"

            # Update is_reworked to 1 on the corresponding EOL record if present
            latest_eol_record = (
                db.query(CellmesAppEol)
                .filter(CellmesAppEol.pack_id == registered_pack.id)
                .order_by(CellmesAppEol.id.desc())
                .first()
            )
            if latest_eol_record:
                latest_eol_record.is_reworked = 1

            db.commit()
        else:
            fail_ctx = latest_nc.fail_reason if latest_nc else "Unresolved Quality Deviation at EOL"
            return make_fail_response(
                f"Interlock Rejection: Battery Pack is currently on quality 'HOLD'. Reason: {fail_ctx}.", 
                code=403
            )

    # Ensure status is now either STARTED or REWORKED to proceed
    if active_wo.wo_status not in ["STARTED", "REWORKED"]:
        return make_fail_response(
            f"Process Violation: Work Order is in an invalid state: '{active_wo.wo_status}'. Assembly blocked.", 
            code=400
        )

    # -------------------------------------------------------------------------
    # VALIDATION 2.5: Upstream Pre-EOL Completion Check
    # -------------------------------------------------------------------------
    latest_pre_eol = (
        db.query(CellmesAppPreEol)
        .filter(CellmesAppPreEol.pack_id == registered_pack.id)
        .order_by(CellmesAppPreEol.id.desc())
        .first()
    )

    if not latest_pre_eol or latest_pre_eol.pre_eol_status.upper() != "PASS":
        return make_fail_response(
            "Sequence Deviation Error: Pack Serial has not successfully passed Pre-EOL testing.",
            code=428
        )

    # -------------------------------------------------------------------------
    # VALIDATION 3: Check cellmes_app_eol table for existing execution / rework status
    # -------------------------------------------------------------------------
    existing_eol = (
        db.query(CellmesAppEol)
        .filter(CellmesAppEol.pack_id == registered_pack.id)
        .order_by(CellmesAppEol.id.desc())
        .first()
    )

    if existing_eol:
        if existing_eol.is_reworked == 0:
            return make_fail_response(
                "Process Duplication Error: Final Chroma End-of-Line testing records already exist for this pack (is_reworked = 0).", 
                code=409
            )
        # If existing_eol.is_reworked == 1, validation passes and execution proceeds

    # -------------------------------------------------------------------------
    # ALL VALIDATIONS PASSED -> SUCCESS AUTHORIZATION RESPONSE
    # -------------------------------------------------------------------------
    return ChromaStartResponse(
        Succeeded=True,
        PackSerialNumber=serial,
        Result="PASS",
        Error=ErrorDetailBlock(ErrorCode=0, ErrorMessage=""),
        SitUafExecutionDetail="Validated"
    )


# =============================================================================
# OPERATION 2: CHROMA COMPLETE (DATA MUTATION ENGINE)
# =============================================================================
@router.post("/chroma-complete", response_model=ChromaCompleteResponse)
def chroma_complete_save_results(payload: ChromaCompletePayload, db: Session = Depends(get_db)):
    req_data = payload.OLA_BCTTestResult.Request
    serial = req_data.BatteryPackSr

    # Normalize verdict
    raw_status = getattr(req_data, "FinalStatus", "FAIL")
    execution_verdict = str(raw_status).strip().upper()

    try:
        registered_pack = db.query(CellmesAppPackScan).filter(CellmesAppPackScan.pack_number == serial).first()
        if not registered_pack:
            return ChromaCompleteResponse(
                Succeeded=False,
                Error=ErrorDetailBlock(ErrorCode=404, ErrorMessage="PACK_NOT_FOUND"),
                SitUafExecutionDetail="Critical Error: Processed pack serial could not be mapped to structural asset registry during complete loop."
            )

        # Parse InspectionDate safely
        parsed_inspection_date = None
        insp_date_attr = getattr(req_data, "InspectionDate", None)
        if insp_date_attr:
            if isinstance(insp_date_attr, str):
                try:
                    parsed_inspection_date = datetime.strptime(insp_date_attr.strip(), "%Y-%m-%d")
                except ValueError:
                    parsed_inspection_date = None
            elif hasattr(insp_date_attr, "year"):
                parsed_inspection_date = datetime.combine(insp_date_attr, datetime.min.time())

        # Safe attribute extraction handling both schema conventions
        raw_start_time = getattr(req_data, "StartTime", None) or getattr(req_data, "Start_time", None)
        raw_end_time = getattr(req_data, "EndTime", None) or getattr(req_data, "End_time", None)

        parsed_start_time = parse_chroma_timestamp(raw_start_time)
        parsed_end_time = parse_chroma_timestamp(raw_end_time)

        # Build EOL Record
        new_eol_log = CellmesAppEol(
            pack_id=registered_pack.id,
            inspection_date=parsed_inspection_date,
            tester_id=getattr(req_data, "TesterID", None),
            channel_id=getattr(req_data, "ChannelID", None),
            cell_deviation=getattr(req_data, "CellDeviation", None) or getattr(req_data, "Cell Deviation", None),
            cell_minimun=getattr(req_data, "CellMinimum", None) or getattr(req_data, "Cell Minimum", None),
            pdu_balancing_temp=getattr(req_data, "PduBalancingTemp", None),
            pack_final_voltage=getattr(req_data, "PackFinalVoltage", None),
            final_soc=getattr(req_data, "FinalSoc", None),
            dc_dc=getattr(req_data, "DcDc", None),
            cell_maximum=getattr(req_data, "CellMaximum", None) or getattr(req_data, "Cell Maximum", None),
            start_soc=getattr(req_data, "StartSoc", None),
            pack_temprature=getattr(req_data, "PackTemperature", None),
            final_status=execution_verdict,
            start_time=parsed_start_time,
            end_time=parsed_end_time,
            is_reworked=0
        )
        db.add(new_eol_log)

        # ---------------------------------------------------------------------
        # SCENARIO 1: PASS
        # ---------------------------------------------------------------------
        if execution_verdict == "PASS":
            registered_pack.chroma_status = "OK"
            db.commit()

            return ChromaCompleteResponse(
                Succeeded=True,
                Error=ErrorDetailBlock(ErrorCode=0, ErrorMessage=""),
                SitUafExecutionDetail="Chroma test results saved successfully."
            )

        # ---------------------------------------------------------------------
        # SCENARIO 2: FAIL
        # ---------------------------------------------------------------------
        elif execution_verdict == "FAIL":
            registered_pack.chroma_status = "NOK"

            active_wo = db.query(CellmesAppPackWo).filter(CellmesAppPackWo.id == registered_pack.wo_id).first()
            if active_wo:
                active_wo.wo_status = "HOLD"

            new_nc_ticket = CellmesAppNcClearance(
                pack_id=registered_pack.id,
                pack_serial=serial,
                station_id="EOL",
                nc_cleared="NO",
                fail_reason=f"Chroma Deviation Volt: {getattr(req_data, 'PackFinalVoltage', 'N/A')}V",
                remarks=f"Chroma test complete failure reported by Tester ID: {getattr(req_data, 'TesterID', 'N/A')} on Channel: {getattr(req_data, 'ChannelID', 'N/A')}."
            )
            db.add(new_nc_ticket)
            db.commit()

            return ChromaCompleteResponse(
                Succeeded=True,
                Error=ErrorDetailBlock(ErrorCode=0, ErrorMessage=""),
                SitUafExecutionDetail="Chroma fail telemetry processed. Asset routed to quality HOLD status."
            )

        else:
            registered_pack.chroma_status = "NOK"
            db.commit()
            raise ValueError(f"Unknown testing payload verdict parameter: '{execution_verdict}'")

    except Exception as db_err:
        db.rollback()
        # Log error to console for debugging
        print(f"[CHROMA ERROR] Exception caught during chroma-complete: {str(db_err)}")

        return ChromaCompleteResponse(
            Succeeded=False,
            Error=ErrorDetailBlock(ErrorCode=500, ErrorMessage="TRANSACTION_ERROR"),
            SitUafExecutionDetail=f"Database execution transaction tracking loop failed. Context: {str(db_err)}"
        )