from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """
    INTERNAL: what create_user() takes. Never accept this from a client --
    provider/provider_id decide how an account can log in, so only server code
    (signup -> "local", the Google callback -> "google") may set them.
    """

    password: Optional[str] = None
    provider: Optional[str] = "local"
    provider_id: Optional[str] = None


class UserSignup(UserBase):
    """
    Public POST /auth/signup body. Deliberately has no provider/provider_id:
    pydantic drops any the client sends, so a signup can only ever create a
    local, password-based account.
    """

    password: Optional[str] = None


class UserOut(UserBase):
    id: UUID
    provider: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {UUID: str}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
