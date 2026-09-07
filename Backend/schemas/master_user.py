from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

# Schema for POST Request (Create User)
class MasterUserCreatePayload(BaseModel):
    user_group: int = Field(..., description="ID of the user group from cellmes_master_usergroup", example=1)
    user_name: str = Field(..., min_length=2, max_length=50, example="John Doe")
    user_id: str = Field(..., min_length=2, max_length=50, example="EMP1024")
    email: Optional[EmailStr] = Field(None, example="john.doe@company.com")
    password: str = Field(..., min_length=6, max_length=100, example="SecurePass123!")

# Schema for PATCH Request (Update User)
class MasterUserUpdatePayload(BaseModel):
    user_group: Optional[int] = Field(None, example=1)
    user_name: Optional[str] = Field(None, min_length=2, max_length=50, example="John Doe")
    user_id: Optional[str] = Field(None, min_length=2, max_length=50, example="EMP1024")
    email: Optional[EmailStr] = Field(None, example="john.doe@company.com")
    password: Optional[str] = Field(None, min_length=6, max_length=100, example="NewSecurePass123!")
    is_active: Optional[str] = Field(None, pattern="^(YES|NO)$", example="YES")

# Schema for GET Response (Displays group_name instead of raw group ID)
class MasterUserResponse(BaseModel):
    id: int
    user_group_id: int = Field(..., alias="user_group")
    group_name: str
    user_name: str
    user_id: str
    email: Optional[str] = None
    failed_attempt: int
    last_login_attemt: Optional[datetime] = None
    is_active: str

    class Config:
        from_attributes = True
        populate_by_name = True

# Standard Action Response Schema
class StandardUserActionResponse(BaseModel):
    status: str
    message: str
    user: MasterUserResponse
    processed_at: datetime