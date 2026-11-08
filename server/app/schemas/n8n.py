from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, SecretStr


class N8nConnectRequest(BaseModel):
    base_url: str = Field(min_length=1, max_length=500)
    api_key: SecretStr = Field(min_length=1, max_length=2000)
    email: str = Field(min_length=1, max_length=255)
    password: SecretStr = Field(min_length=1, max_length=500)


class N8nStatus(BaseModel):
    """Never contains the API key or password, encrypted or not."""

    configured: bool
    base_url: Optional[str] = None
    email: Optional[str] = None
    connected_at: Optional[datetime] = None
    # Each user's own OAuth redirect URI, to register in their Google/GitHub/... app.
    oauth_callback_url: Optional[str] = None
