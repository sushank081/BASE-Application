from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship
from db.session import Base

class CellmesMasterUser(Base):
    __tablename__ = "cellmes_master_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_group = Column(Integer, ForeignKey("cellmes_master_usergroup.id"), nullable=False)
    user_name = Column(String(50), nullable=False)
    user_id = Column(String(50), nullable=False, unique=True)
    email = Column(String(50), nullable=True)
    failed_attempt = Column(Integer, nullable=False, server_default=text("0"))
    last_login_attemt = Column(DateTime, nullable=True)
    is_active = Column(String(10), nullable=False, server_default=text("'YES'::character varying"))
    password_hash = Column(String(255), nullable=False)  # Matching VARCHAR(255)

    group_rel = relationship("CellmesMasterUserGroup", backref="users")