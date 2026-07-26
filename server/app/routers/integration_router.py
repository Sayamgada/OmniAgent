from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_postgres_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.integration import CredentialCheckRequest, CredentialCheckResponse
from app.services.credential_checker import check_required_integrations

router = APIRouter(prefix="/integrations", tags=["integrations"])


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