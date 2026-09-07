from sqlalchemy import Column, Integer, String, DateTime, text
from db.session import Base

class CellmesMasterModuleConfig(Base):
    __tablename__ = "cellmes_master_module_config"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_name = Column(String(50), nullable=True)
    module_material_id = Column(String(20), nullable=False)
    is_active = Column(String(10), nullable=False, server_default=text("'ACTIVE'::character varying"))
    creation_date = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updation_date = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))