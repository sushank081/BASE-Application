from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Integer, DateTime, func
from db.session import Base

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
    created_on = Column(DateTime, nullable=False, server_default=func.now())
    updated_on = Column(DateTime, nullable=True, onupdate=datetime.now)
    wo_used = Column(Integer, nullable=False, default=0)
    line_id = Column(Integer, nullable=True)