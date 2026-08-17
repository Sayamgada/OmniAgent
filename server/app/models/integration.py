import uuid

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Integration(Base):
    """
    One row per (user_id, service). Stores ONLY a pointer to the credential n8n owns
    (n8n_credential_id) -- never raw secrets. n8n's own Credentials API is the actual
    secret store; Postgres just tracks which of the user's services are connected.

    For OAuth2 services (pattern 2/4), n8n itself completes the consent flow via its own
    fixed callback -- OmniAgent never sees the tokens, and never needs to hold the user's
    client_secret itself (it's handed to n8n directly at credential-creation time). That's
    why there's no separate "pending connection" table: the Integration row IS the pending
    record, with oauth_pending=True until a status poll confirms n8n attached real tokens.
    """
    __tablename__ = "integrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    service = Column(String(100), nullable=False, index=True)  # catalog key, e.g. "stripe", "gmail"
    display_name = Column(String(255))

    n8n_credential_id = Column(String(100), nullable=False)  # id returned by n8n's POST /api/v1/credentials
    n8n_credential_type = Column(String(100), nullable=False)  # e.g. "stripeApi" -- n8n's own type slug

    # which catalog auth_option the user actually chose, e.g. "api_key" vs "oauth2" for services
    # (Notion, Slack, GitHub, ...) that support more than one method -- see integration_catalog.py
    auth_option_id = Column(String(50), nullable=False)

    connection_pattern = Column(String(20), nullable=False)  # "text_fields" | "oauth2" | "oauth2_extra"

    # True from the moment the n8n credential shell is created until a status poll confirms
    # the user completed the provider's consent screen. Always False for text-field (pattern 1)
    # services, since those are confirmed connected synchronously on creation.
    oauth_pending = Column(Boolean, default=False, nullable=False)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "service", name="uq_integrations_user_service"),
    )