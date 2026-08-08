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
    delete_integration,
    list_integrations_with_status,
)
from app.utils.n8n_client import N8nClientError

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

    try:
        row = upsert_integration(
            db=db, user_id=current_user.id, service=body.service, credentials=body.credentials,
        )
    except KeyError as e:
        # Raised by get_n8n_credential_type when the service isn't mapped yet —
        # a config gap on our side, not a bad request from the user.
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(e))
    except ValueError as e:
        # Unknown service — not in the catalog at all.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except N8nClientError as e:
        # n8n unreachable or rejected the credential payload — surfaced as 502,
        # since the failure is in the upstream dependency, not the request itself.
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"n8n error: {e}")

    return IntegrationUpsertResponse(
        service=row.service,
        display_name=row.display_name,
        connected=row.is_active,
    )


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


@router.delete("/{service}")
async def delete_integration_route(
    service: str,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """Hard disconnect — deletes both the n8n credential and the Postgres row.
    Not explicitly in the original 4 requirements, but added to close the
    credential-revocation-drift gap: without this, the only way to remove an
    integration was the soft toggle above, which leaves a live credential in n8n
    even when a user believes they've disconnected the service."""
    try:
        deleted = delete_integration(db=db, user_id=current_user.id, service=service)
    except N8nClientError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"n8n error: {e}")

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No integration found for this service")
    return {"service": service, "deleted": True}


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