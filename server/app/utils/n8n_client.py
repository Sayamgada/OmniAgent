"""
app/utils/n8n_client.py

Thin client for n8n's Credentials API. This is where OmniAgent actually pushes
credential material — Postgres never sees a raw key/token, only the credential_id
that comes back from n8n.

Requires in .env / app/core/config.py:
    N8N_BASE_URL   e.g. http://localhost:5678
    N8N_API_KEY    n8n instance API key (Settings -> API in the n8n UI)
"""

import httpx
from fastapi import HTTPException, status
from app.core.config import settings


class N8nClientError(Exception):
    """Raised when n8n's Credentials API returns an unexpected response.
    Caught explicitly at the service layer so we can decide whether to roll back
    a Postgres write, rather than letting a raw httpx exception bubble up."""
    pass


def _headers() -> dict:
    return {
        "X-N8N-API-KEY": settings.N8N_API_KEY,
        "Content-Type": "application/json",
    }


def create_n8n_credential(name: str, credential_type: str, data: dict) -> str:
    """
    Push a credential to n8n. Returns the n8n-assigned credential_id.

    `data` is the raw field payload n8n expects for this credential_type —
    e.g. for gmailOAuth2: {"clientId": ..., "clientSecret": ..., "oauthTokenData": {...}}
    for a plain api_key type: {"apiKey": "..."} (field names are n8n-type-specific;
    see GET /credentials/schema/{credential_type} to confirm exact shape before
    wiring a new service).
    """
    url = f"{settings.N8N_BASE_URL}/api/v1/credentials"
    payload = {"name": name, "type": credential_type, "data": data}

    try:
        resp = httpx.post(url, json=payload, headers=_headers(), timeout=15.0)
    except httpx.RequestError as e:
        raise N8nClientError(f"Could not reach n8n at {settings.N8N_BASE_URL}: {e}") from e

    if resp.status_code not in (200, 201):
        raise N8nClientError(
            f"n8n credential creation failed ({resp.status_code}): {resp.text}"
        )

    body = resp.json()
    credential_id = body.get("id")
    if not credential_id:
        raise N8nClientError(f"n8n response missing credential id: {body}")
    return credential_id


def delete_n8n_credential(credential_id: str) -> bool:
    """
    Delete a credential from n8n. Returns True on success.
    Called whenever a user disconnects/removes an integration, to avoid the
    'credential revocation drift' problem — a stale, still-usable credential
    sitting in n8n after Postgres has forgotten about it.
    Treats 404 (already gone) as success, since the end state we want is
    achieved either way.
    """
    url = f"{settings.N8N_BASE_URL}/api/v1/credentials/{credential_id}"
    try:
        resp = httpx.delete(url, headers=_headers(), timeout=15.0)
    except httpx.RequestError as e:
        raise N8nClientError(f"Could not reach n8n at {settings.N8N_BASE_URL}: {e}") from e

    if resp.status_code not in (200, 204, 404):
        raise N8nClientError(
            f"n8n credential deletion failed ({resp.status_code}): {resp.text}"
        )
    return True