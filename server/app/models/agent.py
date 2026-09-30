import uuid

from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Agent(Base):
    """
    One row per deployed workflow. n8n owns the actual workflow definition
    and execution; this table is ONLY the bridge between an OmniAgent user
    and the n8n workflow they created FROM a (shared, unowned) preview --
    see agent_router.py's create-workflow endpoint, which is what writes
    this row once compile() returns a deployable workflow_json and it's
    been pushed to n8n.

    automation_name is kept (not just the n8n id) so a user's "My Agents"
    list can show something readable without a round trip to n8n, and so
    a user can be pointed back at the SAME cached Mongo preview later if
    they want to re-create/edit it -- automation_name is the join key
    AutomationPreviewService already uses (see get_by_name/update_preview),
    not a foreign key into Mongo, since Mongo previews are shared/unowned.
    """

    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    automation_name = Column(String(255), nullable=False, index=True)
    workflow_name = Column(
        String(255), nullable=False
    )  # what the user was shown/named it as

    n8n_workflow_id = Column(String(100), nullable=False, unique=True)

    # "created"    -- n8n accepted the workflow but it isn't active yet
    # "active"     -- n8n confirmed activation succeeded
    # "failed"     -- n8n rejected creation or activation; see last_error
    status = Column(String(20), nullable=False, default="created")
    last_error = Column(String(1000), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
