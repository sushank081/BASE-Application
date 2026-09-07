from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship
from db.session import Base

# IMPORT EXISTING TRACEABILITY MODELS TO PREVENT METADATA COLLISIONS
from models.module_scan_validation import CellmesAppLhrlScan


class CellmesAppPackWo(Base):
    __tablename__ = "cellmes_app_pack_wo"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    wo_number = Column(String(24), nullable=False)
    po_number = Column(String(24), nullable=False)
    schedule_time = Column(DateTime, nullable=True)
    start_time = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    end_time = Column(DateTime, nullable=True)
    wo_status = Column(String(50), nullable=False)
    work_station = Column(String(16), nullable=True)
    created_on = Column(DateTime, nullable=True)
    order_type = Column(String(16), nullable=True)
    material_number = Column(String(24), nullable=True)
    bop_id = Column(String(24), nullable=True)
    part_name = Column(String(80), nullable=True)
    wo_used = Column(Integer, nullable=False, default=0)


class CellmesAppLhrhScanNonmes(Base):
    __tablename__ = "cellmes_app_lhrh_scan_nonmes"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lh_serial = Column(String(20), nullable=False)
    rh_serial = Column(String(20), nullable=False)
    module_serial = Column(String(20), nullable=True)
    creation_date = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updation_date = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))


class CellmesAppPackScan(Base):
    __tablename__ = "cellmes_app_pack_scan"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    wo_id = Column(BigInteger, nullable=False)
    pack_number = Column(String(52), nullable=False)
    lh_id = Column(BigInteger, ForeignKey("cellmes_app_lhrl_scan.id"), nullable=True)
    rh_id = Column(BigInteger, ForeignKey("cellmes_app_lhrl_scan.id"), nullable=True)
    lhrh_id_nonmes = Column(BigInteger, ForeignKey("cellmes_app_lhrh_scan_nonmes.id"), nullable=True)
    bms_number = Column(String(74), nullable=False)
    pre_eol_status = Column(String(10), nullable=False, default="NO")
    chroma_status = Column(String(10), nullable=False, default="NO")
    pdi_status = Column(String(10), nullable=False, default="NO")
    overall_status = Column(String(10), nullable=False, default="NO")
    created_date = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_date = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))

    # Relationship hooks
    lh_scan = relationship("CellmesAppLhrlScan", foreign_keys=[lh_id])
    rh_scan = relationship("CellmesAppLhrlScan", foreign_keys=[rh_id])
    nonmes_scan = relationship("CellmesAppLhrhScanNonmes", foreign_keys=[lhrh_id_nonmes])