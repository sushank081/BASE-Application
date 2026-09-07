from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship
from db.session import Base

# Import the master definition directly to prevent metadata collisions
from models.cellmes_master_module_master import CellmesMasterModuleMaster

class CellmessAppModuleWo(Base):
    __tablename__ = "cellmess_app_module_wo"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    wo_number = Column(String(24), nullable=False)
    po_number = Column(String(24), nullable=False)
    material_number = Column(String(24), nullable=False)
    part_name = Column(String(80), nullable=False)
    bop_id = Column(String(10), nullable=False)
    work_station = Column(String(16), nullable=False)
    status = Column(String(50), nullable=False)
    schedule_time = Column(DateTime, nullable=True)
    job_end_time = Column(DateTime, nullable=True)
    created_on = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_on = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))
    wo_used = Column(Integer, nullable=False, default=0)
    line_id = Column(Integer, nullable=True)


class CellmesAppLhrlScan(Base):
    __tablename__ = "cellmes_app_lhrl_scan"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    wo_id = Column(BigInteger, ForeignKey("cellmess_app_module_wo.id"), nullable=False)
    lh_serial = Column(String(12), nullable=False)
    is_lh_consumed = Column(Integer, nullable=False, default=0)
    rh_serial = Column(String(12), nullable=False)
    is_rh_consumed = Column(Integer, nullable=False, default=0)
    module_serial = Column(String(12), nullable=False)
    
    # -------------------------------------------------------------------------
    # FIXED: Added target material tracking column definition code block
    # -------------------------------------------------------------------------
    material_number = Column(String(24), nullable=True)

    created_date = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_date = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))
    line_id = Column(Integer, nullable=True)

    work_order = relationship("CellmessAppModuleWo")