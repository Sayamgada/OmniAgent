from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.ai_providers import list_ai_providers
from app.core.auth import get_current_user
from app.database import get_postgres_db
from app.models.user import User
from app.schemas.ai_provider import AIProviderOut
from app.services import integration_service

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
