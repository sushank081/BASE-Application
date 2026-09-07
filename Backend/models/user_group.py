from sqlalchemy import Column, Integer, String, DateTime, text
from db.session import Base

class CellmesMasterUserGroup(Base):
    __tablename__ = "cellmes_master_usergroup"

    id = Column(Integer, primary_key=True, autoincrement=True)
    group_name = Column(String(50), nullable=False, unique=True)
    is_active = Column(String(10), nullable=False, server_default=text("'YES'::character varying"))
    created_date = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updation_time = Column(DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP"))