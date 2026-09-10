"""
Authentication schemas.
"""
from typing import Optional
from pydantic import BaseModel, Field


class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None


from pydantic import BaseModel, Field, ConfigDict

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    virtual_balance: float

    model_config = ConfigDict(from_attributes=True)
