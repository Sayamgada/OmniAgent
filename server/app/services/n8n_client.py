"""
Per-user wrapper around n8n's REST surface -- two DIFFERENT auth mechanisms, used for different things:

1. PUBLIC API (/api/v1/...), authenticated via X-N8N-API-KEY header (the user's own API key).
   Used for: creating/deleting credentials, workflows, executions, credential schemas.
   Documented, stable, safe to call from anywhere.

2. INTERNAL API (/rest/...), authenticated via an n8n session cookie (the user's own n8n login).
   Used ONLY for the two things the public API cannot do:
     - GET /rest/oauth2-credential/auth?id=<id>   -> generates the provider authorization URL
       for an OAuth2 credential, evaluating that credential type's scope/authUrl expressions
       exactly as n8n's own frontend would.
     - GET /rest/credentials/{id}?includeData=true -> returns a masked view of a credential's
       data, from which we read data.data.oauthTokenData (a boolean, never the real token) to
       know whether the user has completed the consent flow yet.
   These are undocumented, UI-facing routes, not a stable public contract -- validated
   empirically against this project's own n8n instance before being relied on here. If a future
   n8n upgrade changes them, these two methods are the only things that need to change.

Multi-tenancy: every OmniAgent user connects THEIR OWN n8n instance (base URL + API key + login).
An N8nClient is built per request by get_n8n_client(user) from that user's encrypted settings.
Session cookies are cached in-process keyed by (user_id, connection_id), so a changed URL/key
(new connection_id) or a different user can never reuse another session.

There are no module-level n8n functions: every caller goes through get_n8n_client(user) or the
require_n8n dependency (app/core/n8n_gate.py). tests/test_no_legacy_n8n_calls.py fails if
anything calls the old module-level API.
"""

import asyncio
import logging
import uuid

import httpx

from app.utils.crypto import decrypt_value

logger = logging.getLogger(__name__)


class N8nClientError(Exception):
    def __init__(self, message: str, status_code: int | None = None, detail=None):
        # `detail` (n8n's actual response body -- the real validation error, e.g. which
        # field/type it rejected) is folded into the exception message so it shows up in
        # logs/tracebacks. NEVER echo str(e) of an N8nClientError to an end user when the
        # base URL is user-controlled: it would expose arbitrary response bodies. Map to
        # fixed messages at the API boundary and log the detail server-side only.
        full_message = f"{message}: {detail}" if detail is not None else message
        super().__init__(full_message)
        self.status_code = status_code
        self.detail = detail


class N8nNotConfigured(Exception):
    """The user has not connected an n8n instance (or the stored connection is incomplete)."""

    code = "n8n_not_configured"

    def __init__(self, message: str = "n8n is not connected for this user"):
        super().__init__(message)


# ---------------- Session cache (process-local) ----------------

_SessionKey = tuple[uuid.UUID, uuid.UUID]  # (user_id, connection_id)
_sessions: dict[_SessionKey, str] = {}
_login_locks: dict[_SessionKey, asyncio.Lock] = {}


def evict_sessions(user_id: uuid.UUID) -> None:
    """
    Drops every cached n8n session for this user. Call on PUT/DELETE of the user's n8n settings.
    Process-local: another worker's stale cookie just gets a 401 and re-logs in.
    """
    for key in [k for k in _sessions if k[0] == user_id]:
        _sessions.pop(key, None)
    for key in [k for k in _login_locks if k[0] == user_id]:
        _login_locks.pop(key, None)


class N8nClient:
    def __init__(
        self,
        user_id: uuid.UUID,
        connection_id: uuid.UUID,
        base_url: str,
        api_key: str,
        email: str,
        password: str,
    ):
        self.user_id = user_id
        self.connection_id = connection_id
        self.base_url = base_url.rstrip("/")
        self._api_key = api_key
        self.email = email
        self._password = password

    # Never let secrets leak through repr() in logs or tracebacks.
    def __repr__(self) -> str:
        return f"N8nClient(user_id={self.user_id}, base_url={self.base_url!r})"

    @property
    def _key(self) -> _SessionKey:
        return (self.user_id, self.connection_id)

    # ---------------- helpers ----------------

    def _http(self, timeout: float) -> httpx.AsyncClient:
        # follow_redirects=False is httpx's default; explicit because the base URL is
        # user-controlled and a redirect could otherwise bounce us to an internal host.
        return httpx.AsyncClient(timeout=timeout, follow_redirects=False)

    def _headers(self) -> dict:
        return {
            "X-N8N-API-KEY": self._api_key,
            "Content-Type": "application/json",
        }

    def _api_base(self) -> str:
        return self.base_url + "/api/v1"

    # ---------------- Settings validation helpers ----------------

    async def ping(self) -> None:
        """Cheap public-API call proving the API key works against this base URL."""
        async with self._http(15.0) as client:
            resp = await client.get(
                f"{self._api_base()}/workflows",
                headers=self._headers(),
                params={"limit": 1},
            )
        if resp.status_code != 200:
            raise N8nClientError(
                f"n8n API key check failed ({resp.status_code})",
                status_code=resp.status_code,
                detail=_safe_json(resp),
            )

    async def verify_login(self) -> None:
        """Proves email/password work for /rest/login. Does not touch the session cache."""
        await self._login()

    # ---------------- Public API (X-N8N-API-KEY) ----------------

    async def create_credential(
        self, name: str, credential_type: str, data: dict
    ) -> dict:
        """
        Creates a credential in n8n via the public API. For OAuth2 credential types, `data` should
        contain clientId/clientSecret (+ any pattern-4 extra fields, e.g. github's "server") and
        NOTHING else -- no tokens yet. Tokens get attached later by n8n itself, via its own
        callback, once the user completes the consent flow started by
        get_oauth2_authorization_url() below.
        """
        payload = {"name": name, "type": credential_type, "data": data}
        async with self._http(15.0) as client:
            resp = await client.post(
                f"{self._api_base()}/credentials", headers=self._headers(), json=payload
            )
        if resp.status_code not in (200, 201):
            raise N8nClientError(
                f"n8n credential creation failed ({resp.status_code})",
                status_code=resp.status_code,
                detail=_safe_json(resp),
            )
        return resp.json()

    async def delete_credential(self, n8n_credential_id: str) -> None:
        async with self._http(15.0) as client:
            resp = await client.delete(
                f"{self._api_base()}/credentials/{n8n_credential_id}",
                headers=self._headers(),
            )
        if resp.status_code not in (200, 204):
            raise N8nClientError(
                f"n8n credential deletion failed ({resp.status_code})",
                status_code=resp.status_code,
                detail=_safe_json(resp),
            )

    async def create_workflow(self, workflow_json: dict) -> dict:
        """
        Creates a workflow in n8n via the public API, from exactly the shape
        compile() produces (name/nodes/connections/settings). Confirmed
        empirically against a real compiled Trigger->AI Agent->Switch->2x
        Gmail Send workflow: n8n accepts the compiler's output VERBATIM, no
        reshaping needed -- it fills in its own per-node defaults (filters,
        pollTimes, a default chat-model `model`, Switch's `options.version`,
        etc.) on save. Returns n8n's full workflow object; callers need at
        least the "id" field to activate it and to store the Agent bridge row.
        """
        async with self._http(30.0) as client:
            resp = await client.post(
                f"{self._api_base()}/workflows",
                headers=self._headers(),
                json=workflow_json,
            )
        if resp.status_code not in (200, 201):
            raise N8nClientError(
                f"n8n workflow creation failed ({resp.status_code})",
                status_code=resp.status_code,
                detail=_safe_json(resp),
            )
        return resp.json()

    async def activate_workflow(self, n8n_workflow_id: str) -> dict:
        """
        Activates a workflow that already exists in n8n. Confirmed empirically:
        a workflow with no trigger/webhook/polling node is REJECTED with
        "Workflow cannot be activated because it has no trigger node. At least
        one trigger, webhook, or polling node is required." -- callers must
        expect activate_workflow() to legitimately fail even when
        create_workflow() succeeded. The caller decides what to do with a
        workflow that exists in n8n but never activated -- see agent_router.py's
        create-workflow endpoint, which keeps the Agent row with status="created"
        and records the error rather than losing track of the n8n workflow id.
        """
        async with self._http(30.0) as client:
            resp = await client.post(
                f"{self._api_base()}/workflows/{n8n_workflow_id}/activate",
                headers=self._headers(),
            )
        if resp.status_code not in (200, 201):
            raise N8nClientError(
                f"n8n workflow activation failed ({resp.status_code})",
                status_code=resp.status_code,
                detail=_safe_json(resp),
            )
        return resp.json()

    async def deactivate_workflow(self, n8n_workflow_id: str) -> dict:
        """
        Deactivates an active workflow (public API). Used by scripts/eval_harness.py
        so a test workflow stops polling before it is deleted.
        """
        async with self._http(30.0) as client:
            resp = await client.post(
                f"{self._api_base()}/workflows/{n8n_workflow_id}/deactivate",
                headers=self._headers(),
            )
        if resp.status_code not in (200, 201):
            raise N8nClientError(
                f"n8n workflow deactivation failed ({resp.status_code})",
                status_code=resp.status_code,
                detail=_safe_json(resp),
            )
        return resp.json()

    async def delete_workflow(self, n8n_workflow_id: str) -> None:
        """
        Deletes a workflow (public API). Callers that created an active workflow
        should deactivate it first.
        """
        async with self._http(30.0) as client:
            resp = await client.delete(
                f"{self._api_base()}/workflows/{n8n_workflow_id}",
                headers=self._headers(),
            )
        if resp.status_code not in (200, 204):
            raise N8nClientError(
                f"n8n workflow deletion failed ({resp.status_code})",
                status_code=resp.status_code,
                detail=_safe_json(resp),
            )

    async def get_workflow(self, n8n_workflow_id: str) -> dict:
        """
        Fetches one workflow (public API). Used to read its live `active` flag so
        the agents list can show what n8n actually says rather than a stale DB
        status. A deleted workflow raises N8nClientError with status_code == 404.
        """
        async with self._http(15.0) as client:
            resp = await client.get(
                f"{self._api_base()}/workflows/{n8n_workflow_id}",
                headers=self._headers(),
            )
        if resp.status_code != 200:
            raise N8nClientError(
                f"n8n workflow lookup failed ({resp.status_code})",
                status_code=resp.status_code,
                detail=_safe_json(resp),
            )
        return resp.json()

    async def list_executions(self, n8n_workflow_id: str, limit: int = 20) -> dict:
        """
        Lists recent executions of one workflow, newest first (public API,
        GET /executions?workflowId=...). Returns n8n's raw {"data": [...],
        "nextCursor": ...}; execution payloads are NOT requested (no includeData),
        so this stays small and never carries workflow data.
        """
        async with self._http(15.0) as client:
            resp = await client.get(
                f"{self._api_base()}/executions",
                headers=self._headers(),
                params={"workflowId": n8n_workflow_id, "limit": limit},
            )
        if resp.status_code != 200:
            raise N8nClientError(
                f"n8n executions lookup failed ({resp.status_code})",
                status_code=resp.status_code,
                detail=_safe_json(resp),
            )
        return resp.json()

    async def get_credential_schema(self, credential_type: str) -> dict:
        async with self._http(15.0) as client:
            resp = await client.get(
                f"{self._api_base()}/credentials/schema/{credential_type}",
                headers=self._headers(),
            )
        if resp.status_code != 200:
            raise N8nClientError(
                f"n8n schema lookup failed ({resp.status_code})",
                status_code=resp.status_code,
                detail=_safe_json(resp),
            )
        return resp.json()

    # ---------------- Internal API (session cookie) ----------------

    async def _login(self) -> str:
        """Logs into this user's n8n and returns the n8n-auth cookie value."""
        async with self._http(15.0) as client:
            resp = await client.post(
                f"{self.base_url}/rest/login",
                json={
                    "emailOrLdapLoginId": self.email,
                    "password": self._password,
                },
            )
        if resp.status_code != 200:
            raise N8nClientError(
                f"n8n login failed ({resp.status_code}) -- check the saved n8n email/password",
                status_code=resp.status_code,
                detail=_safe_json(resp),
            )
        cookie = resp.cookies.get("n8n-auth")
        if not cookie:
            raise N8nClientError(
                "n8n login succeeded but no n8n-auth cookie was returned"
            )
        return cookie

    async def _get_session_cookie(self, stale: str | None = None) -> str:
        """
        Returns the cached session cookie, logging in if there is none. `stale` is the cookie
        the caller just saw rejected: if the cache still holds that same value we re-login,
        but if another request already refreshed it we reuse the fresh one. A per-key lock means
        N concurrent requests after expiry cause exactly one /rest/login.
        """
        key = self._key
        cached = _sessions.get(key)
        if cached is not None and cached != stale:
            return cached
        lock = _login_locks.setdefault(key, asyncio.Lock())
        async with lock:
            cached = _sessions.get(key)
            if cached is not None and cached != stale:
                return cached
            cookie = await self._login()
            _sessions[key] = cookie
            return cookie

    async def _internal_get(self, path: str) -> httpx.Response:
        """
        GETs an internal /rest/... route with the cached session cookie, transparently
        re-logging in once if the cookie has expired (401/403), then retrying exactly once.
        """
        cookie = await self._get_session_cookie()
        async with self._http(15.0) as client:
            resp = await client.get(
                f"{self.base_url}{path}", cookies={"n8n-auth": cookie}
            )
        if resp.status_code in (401, 403):
            cookie = await self._get_session_cookie(stale=cookie)
            async with self._http(15.0) as client:
                resp = await client.get(
                    f"{self.base_url}{path}", cookies={"n8n-auth": cookie}
                )
        return resp

    async def get_oauth2_authorization_url(self, n8n_credential_id: str) -> str:
        """
        Asks n8n to generate the provider authorization URL for this credential -- n8n evaluates
        that credential type's authUrl/scope expressions internally (see module docstring). The
        frontend should send the user's browser to this URL directly; the user's n8n's own fixed
        callback (<their n8n>/rest/oauth2-credential/callback) handles everything after that with
        no OmniAgent involvement.
        """
        resp = await self._internal_get(
            f"/rest/oauth2-credential/auth?id={n8n_credential_id}"
        )
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

    async def is_oauth_credential_connected(self, n8n_credential_id: str) -> bool:
        """
        Polls whether the user has completed the consent flow for this credential yet.
        Reads data.data.oauthTokenData -- a boolean presence flag n8n returns in the masked
        ?includeData=true view. Never exposes the actual token.
        """
        resp = await self._internal_get(
            f"/rest/credentials/{n8n_credential_id}?includeData=true"
        )
        if resp.status_code != 200:
            raise N8nClientError(
                f"Failed to check credential OAuth status ({resp.status_code})",
                status_code=resp.status_code,
                detail=_safe_json(resp),
            )
        body = resp.json()
        return bool(body.get("data", {}).get("data", {}).get("oauthTokenData"))


# ---------------- Factory ----------------


def get_n8n_client(user) -> N8nClient:
    """
    Builds an N8nClient from the user's stored (Fernet-encrypted) n8n settings.
    Raises N8nNotConfigured if any piece is missing. Decrypts and returns immediately -- it
    holds no DB session, so callers never pin a DB connection across slow n8n awaits.
    """
    if not getattr(user, "n8n_configured", False):
        raise N8nNotConfigured()
    return N8nClient(
        user_id=user.id,
        connection_id=user.n8n_connection_id,
        base_url=user.n8n_base_url,
        api_key=decrypt_value(user.n8n_api_key_enc),
        email=user.n8n_email,
        password=decrypt_value(user.n8n_password_enc),
    )


def _safe_json(resp: httpx.Response):
    try:
        return resp.json()
    except Exception:
        return resp.text
