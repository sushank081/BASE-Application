from sqlalchemy import Column, String, DateTime, ForeignKey, BigInteger, Integer, text
from sqlalchemy.orm import relationship
from db.session import Base

# Import existing registration references to ensure seamless ORM joining
from models.pack_scan_validation import CellmesAppPackScan

class CellmesAppPreEol(Base):
    __tablename__ = "cellmes_app_pre_eol"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    pack_id = Column(BigInteger, ForeignKey("cellmes_app_pack_scan.id"), nullable=False)
    pre_eol_status = Column(String(10), nullable=False)
    category = Column(String(50), nullable=True)
    remarks = Column(String(50), nullable=True)
    
    # -------------------------------------------------------------------------
    # FIXED: Added target quality tracking column for rework interlocks
    # -------------------------------------------------------------------------
    is_reworked = Column(Integer, nullable=False, default=0)

    created_date = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_date = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))

    # Relational link pointing back to master pack footprint tracking
    pack_record = relationship("CellmesAppPackScan")