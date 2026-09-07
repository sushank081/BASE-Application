from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship
from db.session import Base

class CellmesAppNcClearance(Base):
    __tablename__ = "cellmes_app_nc_clearance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pack_id = Column(BigInteger, ForeignKey("cellmes_app_pack_scan.id"), nullable=False)
    pack_serial = Column(String(60), nullable=True)
    station_id = Column(String(20), nullable=False)
    nc_cleared = Column(String(10), nullable=False, default="NO")  
    fail_reason = Column(String(50), nullable=True)
    remarks = Column(String(150), nullable=True)
    created_date = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_date = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))
    nc_cleared_date = Column(DateTime, nullable=True)

    # Relational join link back to the parent packaging assembly footprint record
    pack_record = relationship("CellmesAppPackScan", foreign_keys=[pack_id])