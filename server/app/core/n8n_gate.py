"""
FastAPI dependency: the single gate for anything that talks to n8n.

    @router.post(...)
    async def something(n8n: N8nClient = Depends(require_n8n)): ...

Raises HTTP 409 {"code": "n8n_not_configured"} when the user has not connected n8n, which the
frontend turns into the "Connect your n8n" modal followed by an automatic retry.
"""

import logging

from cryptography.fernet import InvalidToken
from fastapi import Depends, HTTPException

from app.core.auth import get_current_user
from app.models.user import User
from app.services.n8n_client import N8nClient, N8nNotConfigured, get_n8n_client

logger = logging.getLogger(__name__)

N8N_NOT_CONFIGURED_DETAIL = {
    "code": "n8n_not_configured",
    "message": "Connect your n8n instance first (Dashboard -> Settings -> n8n).",
}


def require_n8n(user: User = Depends(get_current_user)) -> N8nClient:
    try:
        return get_n8n_client(user)
    except N8nNotConfigured:
        raise HTTPException(status_code=409, detail=N8N_NOT_CONFIGURED_DETAIL)
    except InvalidToken:
        # Stored secrets cannot be decrypted (FERNET_SECRET_KEY changed?). Treat as not
        # connected so the user can re-enter them; log loudly for the operator.
        logger.error("n8n secrets for user %s could not be decrypted", user.id)
        raise HTTPException(status_code=409, detail=N8N_NOT_CONFIGURED_DETAIL)


def optional_n8n(user: User) -> N8nClient | None:
    """
    Same client as require_n8n, but None instead of a 409 when n8n is not connected (or the
    stored secrets cannot be decrypted). For read paths that degrade gracefully, e.g. the
    agent list without a live re-sync.
    """
    try:
        return get_n8n_client(user)
    except N8nNotConfigured:
        return None
    except InvalidToken:
        logger.error("n8n secrets for user %s could not be decrypted", user.id)
        return None
