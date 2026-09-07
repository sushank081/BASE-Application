from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship
from db.session import Base

class CellmesMasterBatteryConfig(Base):
    __tablename__ = "cellmes_master_battery_config"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pack_id = Column(Integer, ForeignKey("cellmes_master_pack_config.id"), nullable=False)
    bms_id = Column(Integer, ForeignKey("cellmes_master_bms_config.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("cellmes_master_module_config.id"), nullable=False)
    is_active = Column(String(10), nullable=False, server_default=text("'ACTIVE'::character varying"))
    created_date = Column(DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_ = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))

    # Relational hooks to allow parent configuration fields to look up automatically
    pack = relationship("CellmesMasterPackConfig")
    bms = relationship("CellmesMasterBmsConfig")
    module = relationship("CellmesMasterModuleConfig")