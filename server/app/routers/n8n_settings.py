import logging
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.n8n_url import N8nUrlError, validate_n8n_url
from app.database import get_postgres_db
from app.models.user import User
from app.schemas.n8n import N8nConnectRequest, N8nStatus
from app.services.n8n_client import N8nClient, N8nClientError, evict_sessions
from app.utils.crypto import encrypt_value

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users/me/n8n", tags=["n8n-settings"])


def _status(user: User) -> N8nStatus:
    if not user.n8n_configured:
        return N8nStatus(configured=False)
    return N8nStatus(
        configured=True,
        base_url=user.n8n_base_url,
        email=user.n8n_email,
        connected_at=user.n8n_connected_at,
        oauth_callback_url=f"{user.n8n_base_url}/rest/oauth2-credential/callback",
    )


def _fail(
    user: User, step: str, status_code: int | None, message: str
) -> HTTPException:
    # Log only the step and status code. n8n's response body comes from a user-controlled
    # host, so it is never logged verbatim and never returned to the client.
    logger.warning(
        "n8n connect failed user=%s step=%s status=%s", user.id, step, status_code
    )
    return HTTPException(status_code=400, detail=message)


@router.get("", response_model=N8nStatus)
async def get_n8n_status(user: User = Depends(get_current_user)):
    return _status(user)


@router.put("", response_model=N8nStatus)
async def connect_n8n(
    body: N8nConnectRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_postgres_db),
):
    try:
        base_url = await validate_n8n_url(body.base_url)
    except N8nUrlError as e:
        raise HTTPException(status_code=400, detail=str(e))

    api_key = body.api_key.get_secret_value()
    password = body.password.get_secret_value()
    email = body.email.strip()

    # Throwaway client for validation only; its connection_id is never stored or cached.
    probe = N8nClient(user.id, uuid.uuid4(), base_url, api_key, email, password)

    try:
        await probe.ping()
    except N8nClientError as e:
        if e.status_code in (401, 403):
            raise _fail(user, "api_key", e.status_code, "n8n rejected the API key.")
        raise _fail(
            user,
            "api_key",
            e.status_code,
            "n8n did not respond as expected. Check that this is your n8n base URL and the API is enabled.",
        )
    except httpx.RequestError:
        raise _fail(user, "api_key", None, "Could not connect to n8n at that URL.")

    try:
        await probe.verify_login()
    except N8nClientError as e:
        if e.status_code in (400, 401, 403):
            raise _fail(
                user,
                "login",
                e.status_code,
                "n8n login failed. Check the email and password.",
            )
        raise _fail(user, "login", e.status_code, "n8n login did not work as expected.")
    except httpx.RequestError:
        raise _fail(user, "login", None, "Could not connect to n8n at that URL.")

    # Same instance (same URL) keeps its connection_id, so credentials/workflows created on it
    # stay valid. A different URL is a different instance: mint a new id so old rows go stale.
    if user.n8n_connection_id is None or user.n8n_base_url != base_url:
        user.n8n_connection_id = uuid.uuid4()
    user.n8n_base_url = base_url
    user.n8n_api_key_enc = encrypt_value(api_key)
    user.n8n_email = email
    user.n8n_password_enc = encrypt_value(password)
    user.n8n_connected_at = datetime.now(timezone.utc)
    db.commit()
    evict_sessions(user.id)
    return _status(user)


@router.delete("", response_model=N8nStatus)
async def disconnect_n8n(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_postgres_db),
):
    # Only clears OmniAgent's stored connection; nothing is deleted on the n8n side.
    user.n8n_base_url = None
    user.n8n_api_key_enc = None
    user.n8n_email = None
    user.n8n_password_enc = None
    user.n8n_connection_id = None
    user.n8n_connected_at = None
    db.commit()
    evict_sessions(user.id)
    return _status(user)
