import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    service = Column(String, nullable=False)              # catalog key, e.g. "gmail", "openai"
    display_name = Column(String, nullable=True)           # snapshot from catalog at connect time
    connection_type = Column(String, nullable=False)       # "api_key" | "oauth" | "oauth_extra" | "mcp_oauth"
    # snapshotting connection_type here (not just looking it up from the catalog live) means
    # a later catalog edit can't silently change how an already-connected row is interpreted.

    n8n_credential_id = Column(String, nullable=True, index=True)
    # The ONLY credential reference stored here. No raw keys, no encrypted blobs — n8n owns
    # the actual secret material and its own at-rest encryption. Nullable because a row could
    # theoretically exist mid-connect (e.g. OAuth redirect started but callback not yet
    # completed) before an n8n credential has been created — see integration_service.py.

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "service", name="uq_user_service"),
    )