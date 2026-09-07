from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class LoginPayload(BaseModel):
    user_id: str = Field(..., min_length=1, example="EMP1024")
    password: str = Field(..., min_length=1, example="SecurePass123!")

class UserTokenData(BaseModel):
    id: int
    user_id: str
    user_name: str
    user_group_id: int
    group_name: str

class LoginResponse(BaseModel):
    status: str
    message: str
    access_token: str
    token_type: str = "bearer"
    user: UserTokenData
    processed_at: datetime