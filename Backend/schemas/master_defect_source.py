from typing import Optional
from pydantic import BaseModel


# Base Schema
class DefectSourceBase(BaseModel):
    defect_name: str


# Schema for POST (Creating a new defect source)
class DefectSourceCreate(DefectSourceBase):
    pass


# Schema for PATCH (Updating defect_name and/or is_active)
class DefectSourceUpdate(BaseModel):
    defect_name: Optional[str] = None
    is_active: Optional[str] = None


# Schema for GET Response
class DefectSourceResponse(BaseModel):
    id: int
    defect_name: Optional[str] = None
    is_active: str

    class Config:
        from_attributes = True