import uuid
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class AgentCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    ir_schema: dict[str, Any] = Field(..., description="Full IR Schema v4 dictionary")


class AgentOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: Optional[str] = None
    ir_schema: dict[str, Any]
    n8n_workflow_id: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
