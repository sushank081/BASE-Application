from sqlalchemy import Column, String, DateTime, ForeignKey, BigInteger, Integer, text
from sqlalchemy.orm import relationship, synonym
from db.session import Base

# Import existing core pack reference
from models.pack_scan_validation import CellmesAppPackScan

class CellmesAppPdiStation(Base):
    __tablename__ = "cellmes_pdi_station"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    pack_id = Column(BigInteger, ForeignKey("cellmes_app_pack_scan.id"), nullable=False)
    leak_test_status = Column(String(10), nullable=False)
    pre_eol_status = Column(String(10), nullable=False)
    chroma_test = Column(String(255), nullable=False)
    
    # Core DB column mapped to `"PDI"`
    pdi = Column("PDI", String(50), nullable=True)

    # Synonym allows both getting and setting `PDI` or `pdi` interchangeably
    PDI = synonym("pdi")

    defect_name = Column(String(50), nullable=True)
    pdi_remarks = Column(String(50), nullable=True)
    pack_status = Column(String(50), nullable=True)
    defect_source = Column(String(50), nullable=True)
    rework_count = Column(Integer, nullable=True)
    created_date = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    update_date = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))
    is_reworked = Column(Integer, nullable=False, default=0)

    # Relational link pointing back to core base pack footprints
    pack_record = relationship("CellmesAppPackScan")