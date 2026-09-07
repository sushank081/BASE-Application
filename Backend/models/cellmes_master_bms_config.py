from sqlalchemy import Column, Integer, String, DateTime, text
from db.session import Base

class CellmesMasterBmsConfig(Base):
    __tablename__ = "cellmes_master_bms_config"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bms_name = Column(String(50), nullable=True)
    bms_material_id = Column(String(14), nullable=False)
    is_active = Column(String(10), nullable=False, server_default=text("'YES'::character varying"))
    created_date = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_date = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))