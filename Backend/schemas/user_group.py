from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# Schema for POST Request (Create Group)
class UserGroupCreatePayload(BaseModel):
    group_name: str = Field(..., min_length=2, max_length=50, example="QUALITY_INSPECTOR")

# Schema for PATCH Request (Update Group)
class UserGroupUpdatePayload(BaseModel):
    group_name: Optional[str] = Field(None, min_length=2, max_length=50, example="LINE_LEAD")
    is_active: Optional[str] = Field(None, pattern="^(YES|NO)$", example="YES")

# Schema for GET Response
class UserGroupResponse(BaseModel):
    id: int
    group_name: str
    is_active: str
    created_date: datetime
    updation_time: Optional[datetime] = None

    class Config:
        from_attributes = True

# Generic Standard Mutation Response Schema
class StandardUserGroupActionResponse(BaseModel):
    status: str
    message: str
    group: UserGroupResponse
    processed_at: datetime