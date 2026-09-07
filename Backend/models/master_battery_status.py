from sqlalchemy import Column, Integer, String
from db.session import Base


class CellmesMasterBatteryStatus(Base):
    __tablename__ = "cellmes_master_battery_status"

    id = Column(Integer, primary_key=True, autoincrement=True)
    status_name = Column(String(50), nullable=True)
    is_active = Column(String(10), nullable=False, default="ACTIVE")