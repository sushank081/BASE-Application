from sqlalchemy import Column, Integer, String, DateTime, text
from db.session import Base

class CellmesMasterModuleMaster(Base):
    __tablename__ = "cellmes_master_module_master"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model = Column(String(50), nullable=True)
    part_no = Column(String(16), nullable=True)
    lh_part_no = Column(String(16), nullable=True)
    rh_part_no = Column(String(16), nullable=True)
    part_name = Column(String(10), nullable=True)
    kw = Column(String(5), nullable=True)
    created_date = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_date = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))
    
    # Note: If you add an 'is_active' column to your SQL table later, uncomment the line below:
    # is_active = Column(String(10), nullable=False, server_default=text("'ACTIVE'::character varying"))