from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base  # ABSOLUTE
import uuid
from sqlalchemy.sql import func


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String)
    provider = Column(String(50), nullable=False, index=True)
    provider_id = Column(String(255))
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Per-user n8n connection. All NULL until the user connects n8n from the dashboard
    # (never collected at signup). The two *_enc columns are Fernet-encrypted
    # (utils/crypto.py); they must never be returned by any API or written to logs.
    # n8n_connection_id identifies WHICH n8n instance the stored credential/workflow ids
    # belong to; it is re-minted only when n8n_base_url changes.
    n8n_base_url = Column(String(500), nullable=True)
    n8n_api_key_enc = Column(Text, nullable=True)
    n8n_email = Column(String(255), nullable=True)
    n8n_password_enc = Column(Text, nullable=True)
    n8n_connection_id = Column(UUID(as_uuid=True), nullable=True)
    n8n_connected_at = Column(DateTime(timezone=True), nullable=True)

    # Saved default AI provider/model for new agents (Task B), pre-selected on
    # the Preview Screen. NULL -> groq and its default model. Run
    # scripts/sql/add_ai_selection_columns.sql once (create_all won't alter).
    default_ai_provider = Column(String(50), nullable=True)
    default_ai_model = Column(String(255), nullable=True)

    @property
    def n8n_configured(self) -> bool:
        return all(
            (
                self.n8n_base_url,
                self.n8n_api_key_enc,
                self.n8n_email,
                self.n8n_password_enc,
                self.n8n_connection_id,
            )
        )
