from sqlalchemy import Column, Integer, String
from db.session import Base


class CellmesMasterDefectList(Base):
    __tablename__ = "cellmes_master_defect_list"

    id = Column(Integer, primary_key=True, autoincrement=True)
    defect_name = Column(String(50), nullable=True)
    is_active = Column(String(10), nullable=False, default="ACTIVE")