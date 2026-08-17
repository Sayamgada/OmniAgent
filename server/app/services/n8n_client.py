"""
Thin wrapper around n8n's REST surface -- two DIFFERENT auth mechanisms, used for different things:

1. PUBLIC API (/api/v1/...), authenticated via X-N8N-API-KEY header (settings.N8N_API_KEY).
   Used for: creating/deleting credentials, fetching credential schemas. Documented, stable,
   safe to call from anywhere.

2. INTERNAL API (/rest/...), authenticated via an n8n session cookie (owner login).
   Used ONLY for the two things the public API cannot do:
     - GET /rest/oauth2-credential/auth?id=<id>   -> generates the provider authorization URL
       for an OAuth2 credential, evaluating that credential type's scope/authUrl expressions
       exactly as n8n's own frontend would.
     - GET /rest/credentials/{id}?includeData=true -> returns a masked view of a credential's
       data, from which we read data.data.oauthTokenData (a boolean, never the real token) to
       know whether the user has completed the consent flow yet.
   These are undocumented, UI-facing routes, not a stable public contract -- validated
   empirically against this project's own n8n instance before being relied on here. If a future
   n8n upgrade changes them, these two functions are the only things that need to change.

Since this is a single self-hosted n8n instance operated entirely by OmniAgent (not one n8n
account per end user), OmniAgent logs in as the n8n owner ONCE and reuses that session for every
user's OAuth connect flow -- multi-tenancy is enforced at OmniAgent's own Postgres layer
(Integration.user_id), not by n8n knowing about individual OmniAgent users at all.
"""

import httpx

from app.core.config import settings


class N8nClientError(Exception):
    def __init__(self, message: str, status_code: int | None = None, detail=None):
        super().__init__(message)
        self.status_code = status_code
        self.detail = detail


# ---------------- Public API (X-N8N-API-KEY) ----------------

def _headers() -> dict:
    return {
        "X-N8N-API-KEY": settings.N8N_API_KEY,
        "Content-Type": "application/json",
    }


def _base_url() -> str:
    return settings.N8N_BASE_URL.rstrip("/") + "/api/v1"


async def create_credential(name: str, credential_type: str, data: dict) -> dict:
    """
    Creates a credential in n8n via the public API. For OAuth2 credential types, `data` should
    contain clientId/clientSecret (+ any pattern-4 extra fields, e.g. github's "server") and
    NOTHING else -- no tokens yet. Tokens get attached later by n8n itself, via its own callback,
    once the user completes the consent flow started by get_oauth2_authorization_url() below.
    """
    payload = {"name": name, "type": credential_type, "data": data}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(f"{_base_url()}/credentials", headers=_headers(), json=payload)
    if resp.status_code not in (200, 201):
        raise N8nClientError(
            f"n8n credential creation failed ({resp.status_code})",
            status_code=resp.status_code,
            detail=_safe_json(resp),
        )
    return resp.json()


async def delete_credential(n8n_credential_id: str) -> None:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.delete(f"{_base_url()}/credentials/{n8n_credential_id}", headers=_headers())
    if resp.status_code not in (200, 204):
        raise N8nClientError(
            f"n8n credential deletion failed ({resp.status_code})",
            status_code=resp.status_code,
            detail=_safe_json(resp),
        )


async def get_credential_schema(credential_type: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{_base_url()}/credentials/schema/{credential_type}", headers=_headers())
    if resp.status_code != 200:
        raise N8nClientError(
            f"n8n schema lookup failed ({resp.status_code})",
            status_code=resp.status_code,
            detail=_safe_json(resp),
        )
    return resp.json()


# ---------------- Internal API (session cookie) ----------------

_session_cookie: str | None = None  # module-level cache; one shared n8n owner session


def _internal_base_url() -> str:
    return settings.N8N_BASE_URL.rstrip("/")


async def _login_as_owner() -> str:
    """Logs into n8n as the owner account and returns the n8n-auth cookie value."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{_internal_base_url()}/rest/login",
            json={
                "emailOrLdapLoginId": settings.N8N_OWNER_EMAIL,
                "password": settings.N8N_OWNER_PASSWORD,
            },
        )
    if resp.status_code != 200:
        raise N8nClientError(
            f"n8n owner login failed ({resp.status_code}) -- check N8N_OWNER_EMAIL/N8N_OWNER_PASSWORD",
            status_code=resp.status_code,
            detail=_safe_json(resp),
        )
    cookie = resp.cookies.get("n8n-auth")
    if not cookie:
        raise N8nClientError("n8n login succeeded but no n8n-auth cookie was returned")
    return cookie


async def _get_session_cookie(force_refresh: bool = False) -> str:
    global _session_cookie
    if _session_cookie is None or force_refresh:
        _session_cookie = await _login_as_owner()
    return _session_cookie


async def _internal_get(path: str) -> httpx.Response:
    """
    GETs an internal /rest/... route with the cached owner session cookie, transparently
    re-logging in once if the cookie has expired (401/403), then retrying exactly once.
    """
    cookie = await _get_session_cookie()
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{_internal_base_url()}{path}",
            cookies={"n8n-auth": cookie},
        )
    if resp.status_code in (401, 403):
        cookie = await _get_session_cookie(force_refresh=True)
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{_internal_base_url()}{path}",
                cookies={"n8n-auth": cookie},
            )
    return resp


async def get_oauth2_authorization_url(n8n_credential_id: str) -> str:
    """
    Asks n8n to generate the provider authorization URL for this credential -- n8n evaluates
    that credential type's authUrl/scope expressions internally (see module docstring). The
    frontend should send the user's browser to this URL directly; n8n's own fixed callback
    (settings.N8N_OAUTH_REDIRECT_URI) handles everything after that with no OmniAgent involvement.
    """
    resp = await _internal_get(f"/rest/oauth2-credential/auth?id={n8n_credential_id}")
    if resp.status_code != 200:
        raise N8nClientError(
            f"Failed to get OAuth2 authorization URL ({resp.status_code})",
            status_code=resp.status_code,
            detail=_safe_json(resp),
        )
    body = resp.json()
    url = body.get("data")
    if not url:
        raise N8nClientError("n8n returned no authorization URL", detail=body)
    return url


async def is_oauth_credential_connected(n8n_credential_id: str) -> bool:
    """
    Polls whether the user has completed the consent flow for this credential yet.
    Reads data.data.oauthTokenData -- a boolean presence flag n8n returns in the masked
    ?includeData=true view. Never exposes the actual token.
    """
    resp = await _internal_get(f"/rest/credentials/{n8n_credential_id}?includeData=true")
    if resp.status_code != 200:
        raise N8nClientError(
            f"Failed to check credential OAuth status ({resp.status_code})",
            status_code=resp.status_code,
            detail=_safe_json(resp),
        )
    body = resp.json()
    return bool(body.get("data", {}).get("data", {}).get("oauthTokenData"))


def _safe_json(resp: httpx.Response):
    try:
        return resp.json()
    except Exception:
        return resp.text