from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_postgres_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.integration import (
    ConnectTextFieldsRequest,
    CatalogEntryOut,
    CheckIntegrationsRequest,
    CheckIntegrationsResponse,
    OAuthConnectInitRequest,
    OAuthConnectInitResponse,
    OAuthStatusResponse,
)
from app.services import integration_service

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("", response_model=list[CatalogEntryOut])
def list_integrations(
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """Full catalog merged with this user's connected/configured status."""
    return integration_service.list_integrations_with_status(db, current_user.id)


@router.post("/connect/text-fields")
async def connect_text_fields(
    body: ConnectTextFieldsRequest,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """
    Text-fields (pattern 1) auth options only -- covers a plain single-method service (e.g. Stripe)
    or the api_key/personal_access_token branch of a multi-option service (e.g. Notion, GitHub).
    body.option_id selects which auth_option when a service offers more than one; omit it to use
    the catalog's default_option. For a service's OAuth2 options (pattern 2/4), use
    /integrations/oauth/connect (not built yet -- next step).
    """
    row = await integration_service.connect_text_fields(
        db, current_user.id, body.service, body.values, body.option_id
    )
    return {
        "service": row.service,
        "auth_option": row.auth_option_id,
        "connected": row.is_active,
        "n8n_credential_id": row.n8n_credential_id,
    }


@router.delete("/{service}")
async def disconnect_integration(
    service: str,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    await integration_service.disconnect_integration(db, current_user.id, service)
    return {"service": service, "disconnected": True}


@router.post("/check", response_model=CheckIntegrationsResponse)
def check_integrations(
    body: CheckIntegrationsRequest,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    required = [r.model_dump() for r in body.required_integrations]
    return integration_service.check_required_integrations(db, current_user.id, required)


@router.post("/oauth/connect", response_model=OAuthConnectInitResponse)
async def connect_oauth(
    body: OAuthConnectInitRequest,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pattern 2/4 only. Creates the n8n credential shell with the user's own client_id/client_secret
    and returns an authorization_url. The frontend should open that URL in a new tab/popup for the
    user to complete the provider's consent screen -- n8n's own fixed callback handles everything
    after that. Poll GET /integrations/oauth/status/{service} to find out when it's done.
    """
    return await integration_service.connect_oauth_init(
        db,
        current_user.id,
        body.service,
        body.client_id,
        body.client_secret,
        body.extra_fields,
        body.option_id,
    )


@router.get("/oauth/status/{service}", response_model=OAuthStatusResponse)
async def oauth_status(
    service: str,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    return await integration_service.check_oauth_status(db, current_user.id, service)