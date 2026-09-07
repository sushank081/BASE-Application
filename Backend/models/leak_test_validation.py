from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship
from db.session import Base

# Import the existing pack scan model to prevent MetaData collision issues
from models.pack_scan_validation import CellmesAppPackScan

class CellmesAppLeakTest(Base):
    __tablename__ = "cellmes_app_leaktest"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    pack_id = Column(BigInteger, ForeignKey("cellmes_app_pack_scan.id"), nullable=False)
    leak_test_value = Column(Integer, nullable=True)
    leak_test_result = Column(String(10), nullable=True)
    
    # New Quality Tracking Vector added for Gate 4 retest authorization
    is_reworked = Column(Integer, nullable=False, server_default=text("0"), default=0)
    
    test_start_time = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_date = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))

    # Establish relational connection to look up pack details smoothly
    pack_record = relationship("CellmesAppPackScan")