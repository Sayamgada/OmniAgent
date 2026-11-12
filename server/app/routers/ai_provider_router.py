from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.ai_providers import list_ai_providers
from app.core.auth import get_current_user
from app.database import get_postgres_db
from app.models.user import User
from app.schemas.ai_provider import AIProviderOut
from app.services import integration_service
from app.services.ai_selection import AISelectionError, selection_for

router = APIRouter(prefix="/ai-providers", tags=["ai-providers"])


@router.get("", response_model=list[AIProviderOut])
def list_providers(
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """
    The providers a user can pick for their agent's AI step, with per-user connected status.
    Read-only, so deliberately not behind require_n8n (same as GET /integrations).
    """
    connected = integration_service.get_connected_services(
        db, current_user.id, n8n_connection_id=current_user.n8n_connection_id
    )
    out = []
    for p in list_ai_providers():
        node = p.chat_node
        out.append(
            AIProviderOut(
                service=p.key,
                display_name=p.display_name,
                default_model=p.default_model,
                models=list(p.models),
                allow_custom_model=p.allow_custom_model,
                connected=p.key in connected,
                available=node is not None,
                node_type=node["type"] if node else None,
                node_type_version=(
                    float(node["typeVersion"])
                    if node and node.get("typeVersion") is not None
                    else None
                ),
            )
        )
    return out


class AIDefault(BaseModel):
    """The user's saved default. ai_provider null = no saved default (groq)."""

    ai_provider: Optional[str] = Field(default=None, max_length=50)
    ai_model: Optional[str] = Field(default=None, max_length=255)


def _effective_default(user: User) -> AIDefault:
    provider, model = selection_for(user)
    return AIDefault(ai_provider=provider, ai_model=model)


@router.get("/default", response_model=AIDefault)
def get_default(current_user: User = Depends(get_current_user)):
    """The provider/model a new agent starts with (saved default, else groq)."""
    return _effective_default(current_user)


@router.put("/default", response_model=AIDefault)
def put_default(
    body: AIDefault,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """
    Save the user's default. A null/blank ai_provider clears it; a blank
    ai_model stores the provider's default model. Validated the same way as a
    per-request selection (unknown provider -> 422).
    """
    # Re-load through this request's session, so the commit below persists
    # whichever session get_current_user loaded the user with.
    user = db.get(User, current_user.id)
    if not (body.ai_provider or "").strip():
        user.default_ai_provider = None
        user.default_ai_model = None
    else:
        try:
            provider, model = selection_for(None, body.ai_provider, body.ai_model)
        except AISelectionError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
            ) from None
        user.default_ai_provider = provider
        user.default_ai_model = model
    db.commit()
    db.refresh(user)
    return _effective_default(user)
