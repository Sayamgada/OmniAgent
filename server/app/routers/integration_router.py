from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_postgres_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.integration import (
    CredentialCheckRequest,
    CredentialCheckResponse,
    IntegrationCatalogItem,
    IntegrationUpsertRequest,
    IntegrationUpsertResponse,
)
from app.services.credential_checker import check_required_integrations
from app.services.integration_service import (
    upsert_integration,
    toggle_integration,
    list_integrations_with_status,
)

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("", response_model=list[IntegrationCatalogItem])
async def list_integrations(
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    return list_integrations_with_status(db=db, user_id=current_user.id)


@router.post("", response_model=IntegrationUpsertResponse)
async def add_or_update_integration(
    body: IntegrationUpsertRequest,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    if not body.credentials:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="credentials cannot be empty")

    row = upsert_integration(
        db=db, user_id=current_user.id, service=body.service, credentials=body.credentials,
    )
    return IntegrationUpsertResponse(service=row.service, display_name=row.display_name, connected=row.is_active)


@router.patch("/{service}/toggle")
async def toggle_integration_route(
    service: str,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    row = toggle_integration(db=db, user_id=current_user.id, service=service)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No credentials saved yet — add API keys first")
    return {"service": service, "connected": row.is_active}


@router.post("/check", response_model=CredentialCheckResponse)
async def check_credentials(
    body: CredentialCheckRequest,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    results = check_required_integrations(
        db=db,
        user_id=current_user.id,
        required_integrations=body.required_integrations,
    )

    return CredentialCheckResponse(
        all_required_available=all(r["available"] for r in results if r["required"]),
        integrations=results,
    )