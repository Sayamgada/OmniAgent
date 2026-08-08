"""
app/routers/google_oauth_router.py

Handles the "Connect Google" flow for integrations — separate from auth.py's
"Sign in with Google" login flow, per the earlier decision to keep these isolated
(different concern: identity vs. authorization delegation; different token
lifetimes: session vs. long-lived refresh_token).

Because we chose the combined-scope model (one consent screen requests all 8
Google scopes), a single successful callback pushes n8n credentials for ALL
GOOGLE_SERVICES at once — the user clicks "Connect Google" once, not 9 times.

Requires in .env / app/core/config.py:
    GOOGLE_OAUTH_CLIENT_ID
    GOOGLE_OAUTH_CLIENT_SECRET
    GOOGLE_OAUTH_REDIRECT_URI   e.g. http://localhost:8000/integrations/oauth/google/callback
    SECRET_KEY                  already exists for JWT signing in auth.py — reused here
                                 to sign the OAuth `state` param, NOT to issue login sessions.
"""

import time
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import get_postgres_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.user import User
from app.services.integration_service import upsert_integration
from app.utils.n8n_client import N8nClientError

router = APIRouter(prefix="/integrations/oauth/google", tags=["integrations-oauth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

# Combined scope set — option 1 (locked in): one consent covers every registered
# Google service. Order doesn't matter; space-joined per OAuth spec.
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/presentations",
    "https://www.googleapis.com/auth/contacts",
    "https://www.googleapis.com/auth/tasks",
]

# The catalog services this single flow provisions n8n credentials for, and the
# n8n credential `type` string each one needs (from n8n_credential_types.py's map).
GOOGLE_SERVICES = [
    "gmail",
    "google_calendar",
    "drive",
    "google_docs",
    "google_sheets",
    "google_sheets_trigger",
    "google_slides",
    "google_contacts",
    "google_tasks",
]

STATE_TTL_SECONDS = 600  # 10 minutes to complete the consent flow


def _pack_state(user_id: str) -> str:
    """Signed, short-lived token carrying the user's identity through the
    redirect round-trip, since the callback has no Authorization header to read."""
    payload = {"user_id": user_id, "exp": time.time() + STATE_TTL_SECONDS}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def _unpack_state(state: str) -> str:
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OAuth state")
    return payload["user_id"]


@router.get("/start")
async def start_google_oauth(
    current_user: User = Depends(get_current_user),
):
    """Called from the frontend as a normal fetch (has the Authorization header),
    returns the Google consent URL for the frontend to redirect the browser to —
    rather than redirecting server-side, since this endpoint IS reachable with
    the auth header (it's a fetch, not a page navigation)."""
    state = _pack_state(str(current_user.id))
    params = {
        "client_id": settings.N8N_GOOGLE_CLIENT_ID,
        "redirect_uri": settings.N8N_GOOGLE_OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",   # required to get a refresh_token at all
        "prompt": "consent",        # forces refresh_token on every connect, not just the first
        "state": state,
    }
    return {"authorize_url": f"{GOOGLE_AUTH_URL}?{urlencode(params)}"}


@router.get("/callback")
async def google_oauth_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_postgres_db),
):
    """Google redirects the browser here directly — no Authorization header
    available, hence the signed `state` round-trip. On success, redirects back
    to the frontend Integrations page; on failure, redirects with an error flag
    rather than returning raw JSON to a browser navigation."""
    frontend_base = settings.FRONTEND_BASE_URL  # e.g. http://localhost:5173

    if error:
        return RedirectResponse(f"{frontend_base}/integrations?oauth_error={error}")
    if not code or not state:
        return RedirectResponse(f"{frontend_base}/integrations?oauth_error=missing_code_or_state")

    try:
        user_id = _unpack_state(state)
    except HTTPException:
        return RedirectResponse(f"{frontend_base}/integrations?oauth_error=invalid_state")

    # Exchange the authorization code for tokens
    try:
        token_resp = httpx.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.N8N_GOOGLE_CLIENT_ID,
                "client_secret": settings.N8N_GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.N8N_GOOGLE_OAUTH_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=15.0,
        )
    except httpx.RequestError:
        return RedirectResponse(f"{frontend_base}/integrations?oauth_error=google_unreachable")

    if token_resp.status_code != 200:
        return RedirectResponse(f"{frontend_base}/integrations?oauth_error=token_exchange_failed")

    tokens = token_resp.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3599)

    if not refresh_token:
        # Almost always means prompt=consent was dropped somewhere, or the user
        # had already granted this exact scope set before without revoking access.
        return RedirectResponse(f"{frontend_base}/integrations?oauth_error=no_refresh_token")

    oauth_token_data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": tokens.get("token_type", "Bearer"),
        "expires_in": expires_in,
    }

    # One consent, nine n8n credentials — this is the payoff of the combined-scope design.
    failed_services = []
    for service in GOOGLE_SERVICES:
        try:
            upsert_integration(
                db=db,
                user_id=user_id,
                service=service,
                credentials={
                    "clientId": settings.N8N_GOOGLE_CLIENT_ID,
                    "clientSecret": settings.N8N_GOOGLE_CLIENT_SECRET,
                    "oauthTokenData": oauth_token_data,
                },
            )
        except (N8nClientError, KeyError, ValueError):
            # KeyError: service not yet in N8N_CREDENTIAL_TYPE_MAP.
            # Don't abort the whole batch over one unmapped/unreachable service —
            # partial success (e.g. 7 of 9 connected) is still useful; report which failed.
            failed_services.append(service)

    if failed_services:
        return RedirectResponse(
            f"{frontend_base}/integrations?oauth_partial=1&failed={','.join(failed_services)}"
        )
    return RedirectResponse(f"{frontend_base}/integrations?oauth_success=google")