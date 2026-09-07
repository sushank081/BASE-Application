from typing import Optional
from pydantic import BaseModel


# Base Schema
class DefectBase(BaseModel):
    defect_name: str


# Schema for POST (Creating a new defect)
class DefectCreate(DefectBase):
    pass


# Schema for PATCH (Partial update of defect_name and/or is_active)
class DefectUpdate(BaseModel):
    defect_name: Optional[str] = None
    is_active: Optional[str] = None


# Schema for GET Response
class DefectResponse(BaseModel):
    id: int
    defect_name: Optional[str] = None
    is_active: str

    class Config:
        from_attributes = True