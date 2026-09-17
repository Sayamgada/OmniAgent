import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Agent(Base):
    """
    Tracks an automation agent configured and compiled by a user.
    Stores the full IR schema JSON for future re-compilation and the
    resulting n8n_workflow_id once successfully deployed to n8n.
    """
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)

    # Full IR Schema v4 dictionary (including preview_json)
    ir_schema = Column(JSON, nullable=False)

    # Assigned once deployed to n8n
    n8n_workflow_id = Column(String(100), nullable=True)

    # Status: 'draft' | 'compiled' | 'failed'
    status = Column(String(50), nullable=False, default="draft")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
