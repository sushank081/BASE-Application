from sqlalchemy import Column, String, DateTime, ForeignKey, BigInteger, Integer, text
from sqlalchemy.orm import relationship
from db.session import Base

# Import existing core pack model reference
from models.pack_scan_validation import CellmesAppPackScan

class CellmesAppEol(Base):
    __tablename__ = "cellmes_app_eol"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    pack_id = Column(BigInteger, ForeignKey("cellmes_app_pack_scan.id"), nullable=False)
    inspection_date = Column(DateTime, nullable=True)
    tester_id = Column(String(10), nullable=True)
    channel_id = Column(String(10), nullable=True)
    cell_deviation = Column(String(10), nullable=True)
    cell_minimun = Column(String(10), nullable=True)
    pdu_balancing_temp = Column(String(10), nullable=True)
    pack_final_voltage = Column(String(10), nullable=True)
    final_soc = Column(String(10), nullable=True)
    dc_dc = Column(String(10), nullable=True)
    cell_maximum = Column(String(10), nullable=True)
    start_soc = Column(String(10), nullable=True)
    pack_temprature = Column(String(10), nullable=True)
    final_status = Column(String(50), nullable=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    creation_date = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updation_date = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))
    is_reworked = Column(Integer, nullable=False, default=0, server_default=text("0"))

    # Relationship link pointing back to master pack tracking
    pack_record = relationship("CellmesAppPackScan")