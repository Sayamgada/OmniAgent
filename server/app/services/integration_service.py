# app/services/integration_service.py
import json
import uuid

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.integration import Integration
from app.core.integration_catalog import INTEGRATION_CATALOG, get_auth_option
from app.core.n8n_errors import N8N_ERRORS, n8n_http_error
from app.services.n8n_client import N8nClient, N8nClientError
from app.core.n8n_gate import N8N_NOT_CONFIGURED_DETAIL
from app.core.n8n_stale import fresh_clause, is_stale

PATTERN_LABELS = {1: "text_fields", 2: "oauth2", 3: "mcp_oauth", 4: "oauth2_extra"}

# n8n's base OAuth2Api credential type carries its own internal mechanics
# (grant type, token URLs, JWE/JWKS verification, request-signing options)
# that credentials.json lists as visible "advanced settings" properties --
# but n8n's public credential-creation API rejects them as "not allowed
# additional property" regardless of value, confirmed independently on
# gmailOAuth2 (tokenExpiredStatusCode, jwksUri) and notionMcpOAuth2Api
# (jwksUri again). These are n8n-managed internals, never legitimate
# service data -- excluded outright rather than guessed at per-field via
# default-matching, which proved fragile (string-equality on a default URL
# is an easy thing to break on a render/whitespace quirk).
OAUTH2_MECHANIC_FIELDS = {
    "grantType",
    "authUrl",
    "accessTokenUrl",
    "authQueryParameters",
    "sendAdditionalBodyProperties",
    "additionalBodyProperties",
    "ignoreSSLIssues",
    "tokenExpiredStatusCode",
    "jweEnabled",
    "jwksUri",
    "inlineJwks",
}


def _get_catalog_entry(service: str) -> dict:
    entry = INTEGRATION_CATALOG.get(service)
    if not entry:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Unknown service '{service}' — not in integration catalog",
        )
    return entry


def _get_option(service: str, option_id: str | None) -> dict:
    """
    Resolves which auth_option the request refers to. Some services (Notion, Slack, GitHub,
    HubSpot, ...) expose more than one -- e.g. api_key vs oauth2 -- so option_id disambiguates.
    Falls back to the catalog's default_option (the simplest non-OAuth method) if omitted.
    """
    opt = get_auth_option(service, option_id)
    if not opt:
        entry = _get_catalog_entry(service)
        valid_ids = [o["option_id"] for o in entry["auth_options"]]
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unknown auth option '{option_id}' for '{service}'. Valid options: {valid_ids}",
        )
    return opt


def _coerce_value(field: dict, raw):
    """
    n8n's own credential schema validates real types (boolean, number) --
    but every value arriving here from a form submission is a string
    (and our registry's field defaults are strings too, for frontend
    rendering -- see generate_registry.py's _stringify_default). Coerce
    back to the type n8n actually expects before it ever reaches
    n8n.create_credential, regardless of what the frontend sends.
    """
    t = field.get("type")

    if not isinstance(raw, str):
        return raw  # already the right shape (e.g. a real bool/number) -- leave it

    stripped = raw.strip()

    if t == "boolean":
        return stripped.lower() in ("true", "1", "yes", "on")

    if t == "number":
        if stripped == "":
            return None
        try:
            return int(stripped)
        except ValueError:
            return float(stripped)

    if t == "json":
        if stripped == "":
            return None
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            # let n8n's own validation surface the real error rather than
            # silently swallowing genuinely malformed input here
            return raw

    return raw  # string / options / password -- no coercion needed


def _validate_text_fields(service: str, option: dict, values: dict) -> dict:
    """
    Checks the submitted values cover every required field the chosen auth_option defines,
    drops anything not in that option's field list (never forward arbitrary extra keys
    to n8n), and coerces each value to the type n8n's schema actually expects. Returns the
    n8n-ready data payload (field name -> correctly-typed value).
    """
    if option["connection_pattern"] != 1:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"'{service}' auth option '{option['option_id']}' is not a text-fields method "
            f"(pattern {option['connection_pattern']}); use the OAuth connect flow instead.",
        )

    fields_by_name = {f["name"]: f for f in option["fields"]}
    option_field_names = set(fields_by_name)
    missing = option_field_names - values.keys()
    if missing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Missing required field(s) for '{service}' ({option['option_id']}): {sorted(missing)}",
        )

    return {
        k: _coerce_value(fields_by_name[k], v)
        for k, v in values.items()
        if k in option_field_names
    }


async def _drop_previous_credential(existing: Integration, n8n: N8nClient) -> None:
    """
    Best-effort delete of the credential a reconnect is replacing. Skipped for a STALE row:
    its n8n_credential_id belongs to a previous instance, and on the current one the same id
    could be a different credential (older n8n versions hand out sequential ids). The orphan
    on the old instance is unreachable from here anyway.
    """
    if is_stale(existing.n8n_connection_id, n8n.connection_id):
        return
    try:
        await n8n.delete_credential(existing.n8n_credential_id)
    except N8nClientError:
        pass  # old credential may already be gone/invalid -- don't block the new save


async def connect_text_fields(
    db: Session,
    user_id: uuid.UUID,
    service: str,
    values: dict,
    option_id: str | None = None,
    *,
    n8n: N8nClient,
) -> Integration:
    entry = _get_catalog_entry(service)
    option = _get_option(service, option_id)
    n8n_data = _validate_text_fields(service, option, values)

    existing = (
        db.query(Integration)
        .filter(Integration.user_id == user_id, Integration.service == service)
        .first()
    )

    credential_name = f"omniagent-{service}-{option['option_id']}-{str(user_id)[:8]}"
    try:
        n8n_cred = await n8n.create_credential(
            name=credential_name,
            credential_type=option["n8n_credential_type"],
            data=n8n_data,
        )
    except N8N_ERRORS as e:
        raise n8n_http_error(
            "create_credential", e, "Could not create the credential in n8n"
        ) from None
    new_n8n_credential_id = n8n_cred["id"]

    if existing:
        # replace: delete the old n8n credential first (best-effort), then point at the new one.
        # Switching auth_option (e.g. api_key -> oauth2) on reconnect is allowed -- the row just
        # repoints to the new credential type.
        await _drop_previous_credential(existing, n8n)
        existing.n8n_credential_id = new_n8n_credential_id
        existing.n8n_credential_type = option["n8n_credential_type"]
        existing.n8n_connection_id = n8n.connection_id
        existing.auth_option_id = option["option_id"]
        existing.display_name = entry["display_name"]
        existing.connection_pattern = PATTERN_LABELS[option["connection_pattern"]]
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing

    row = Integration(
        user_id=user_id,
        service=service,
        display_name=entry["display_name"],
        n8n_credential_id=new_n8n_credential_id,
        n8n_credential_type=option["n8n_credential_type"],
        n8n_connection_id=n8n.connection_id,
        auth_option_id=option["option_id"],
        connection_pattern=PATTERN_LABELS[option["connection_pattern"]],
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


async def disconnect_integration(
    db: Session,
    user_id: uuid.UUID,
    service: str,
    *,
    n8n: N8nClient | None,
    n8n_connection_id: uuid.UUID | None,
) -> None:
    """
    `n8n` is None when the user has no usable n8n connection; `n8n_connection_id` is their
    current one (None when not connected). A STALE row (stamped for a previous instance) is
    removed from Postgres only: its credential id means nothing on the instance reachable now,
    so no n8n call is made -- which also lets a user clear stale rows with no n8n connected.
    A fresh row still needs the client (409 n8n_not_configured without one).
    """
    row = (
        db.query(Integration)
        .filter(Integration.user_id == user_id, Integration.service == service)
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"'{service}' is not connected")
    if not is_stale(row.n8n_connection_id, n8n_connection_id):
        if n8n is None:
            raise HTTPException(status.HTTP_409_CONFLICT, N8N_NOT_CONFIGURED_DETAIL)
        try:
            await n8n.delete_credential(row.n8n_credential_id)
        except N8nClientError:
            pass  # already deleted on n8n's side -- don't block removing our own record
    db.delete(row)
    db.commit()


def list_integrations_with_status(
    db: Session, user_id: uuid.UUID, *, n8n_connection_id: uuid.UUID | None
) -> list[dict]:
    connected_rows = {
        r.service: r
        for r in db.query(Integration).filter(Integration.user_id == user_id).all()
    }
    out = []
    for service, entry in INTEGRATION_CATALOG.items():
        row = connected_rows.get(service)
        # A row stamped for a previous n8n instance is not usable: report it configured (so the
        # user can still see/reconnect/remove it) but never connected.
        stale = row is not None and is_stale(row.n8n_connection_id, n8n_connection_id)
        out.append(
            {
                "service": entry["service"],
                "display_name": entry["display_name"],
                "category": entry["category"],
                "default_option": entry["default_option"],
                "auth_options": entry["auth_options"],
                "connected": bool(row and row.is_active and not stale),
                "configured": row is not None,
                "connected_option": row.auth_option_id if row and not stale else None,
                "stale": stale,
            }
        )
    return out


def get_connected_services(
    db: Session, user_id: uuid.UUID, *, n8n_connection_id: uuid.UUID | None
) -> set[str]:
    """
    Services this user counts as connected: active rows stamped for the user's CURRENT n8n
    instance. Single source of truth for "connected" -- used by check_required_integrations
    and GET /ai-providers so the two can never disagree.
    """
    return {
        r.service
        for r in db.query(Integration)
        .filter(
            Integration.user_id == user_id,
            Integration.is_active == True,
            fresh_clause(Integration.n8n_connection_id, n8n_connection_id),
        )
        .all()
    }


def check_required_integrations(
    db: Session,
    user_id: uuid.UUID,
    required: list[dict],
    *,
    n8n_connection_id: uuid.UUID | None,
) -> dict:
    connected_services = get_connected_services(
        db, user_id, n8n_connection_id=n8n_connection_id
    )
    statuses = []
    all_available = True
    for req in required:
        is_connected = req["service"] in connected_services
        if req.get("required", True) and not is_connected:
            all_available = False
        statuses.append(
            {
                "service": req["service"],
                "display_name": req.get("display_name"),
                "required": req.get("required", True),
                "connected": is_connected,
            }
        )
    return {"integrations": statuses, "all_required_available": all_available}


# ---------------- OAuth2 (pattern 2 / pattern 4) ----------------


async def connect_oauth_init(
    db: Session,
    user_id: uuid.UUID,
    service: str,
    client_id: str,
    client_secret: str,
    extra_fields: dict,
    option_id: str | None = None,
    *,
    n8n: N8nClient,
) -> dict:
    """
    Creates the n8n credential shell (clientId/clientSecret + any pattern-4 extras, no tokens),
    asks n8n for the authorization URL, and records a pending Integration row. The actual token
    exchange happens entirely inside n8n once the user completes the provider's consent screen --
    OmniAgent is not involved in and never sees that step.
    """
    entry = _get_catalog_entry(service)
    option = _get_option(service, option_id)

    if option["connection_pattern"] not in (2, 4):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"'{service}' auth option '{option['option_id']}' is not an OAuth2 method "
            f"(pattern {option['connection_pattern']}); use /integrations/connect/text-fields instead.",
        )

    fields_by_name = {f["name"]: f for f in option["fields"]}

    # only forward extra fields the catalog actually defines for this option (excluding
    # clientId/clientSecret, which are handled explicitly, not user-suppliable arbitrary keys)
    unknown = set(extra_fields.keys()) - set(fields_by_name)
    if unknown:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unknown extra field(s) for '{service}' ({option['option_id']}): {sorted(unknown)}. "
            f"Expected a subset of: {sorted(fields_by_name)}",
        )

    # Two layers of exclusion, both needed:
    #  1. OAUTH2_MECHANIC_FIELDS -- n8n-internal OAuth2Api mechanics n8n's API
    #     never accepts as data, regardless of value (hard blocklist).
    #  2. unchanged-from-default -- genuinely service-specific optional fields
    #     (e.g. enabledScopes) that the user left untouched; let n8n apply its
    #     own default rather than re-sending the same value redundantly.
    coerced_extra = {}
    for k, raw in extra_fields.items():
        if k in OAUTH2_MECHANIC_FIELDS:
            continue
        field = fields_by_name[k]
        stripped = raw.strip() if isinstance(raw, str) else raw
        if stripped == "" or stripped == field.get("default"):
            continue  # unchanged from default -- let n8n apply its own
        coerced_extra[k] = _coerce_value(field, raw)
    n8n_data = {"clientId": client_id, "clientSecret": client_secret, **coerced_extra}

    existing = (
        db.query(Integration)
        .filter(Integration.user_id == user_id, Integration.service == service)
        .first()
    )

    credential_name = f"omniagent-{service}-{option['option_id']}-{str(user_id)[:8]}"
    try:
        n8n_cred = await n8n.create_credential(
            name=credential_name,
            credential_type=option["n8n_credential_type"],
            data=n8n_data,
        )
    except N8N_ERRORS as e:
        raise n8n_http_error(
            "create_credential", e, "Could not create the credential in n8n"
        ) from None
    new_n8n_credential_id = n8n_cred["id"]

    if existing:
        await _drop_previous_credential(existing, n8n)
        existing.n8n_credential_id = new_n8n_credential_id
        existing.n8n_credential_type = option["n8n_credential_type"]
        existing.n8n_connection_id = n8n.connection_id
        existing.auth_option_id = option["option_id"]
        existing.display_name = entry["display_name"]
        existing.connection_pattern = PATTERN_LABELS[option["connection_pattern"]]
        existing.oauth_pending = True
        existing.is_active = (
            False  # not truly connected until the status poll confirms it
        )
        db.commit()
        db.refresh(existing)
    else:
        existing = Integration(
            user_id=user_id,
            service=service,
            display_name=entry["display_name"],
            n8n_credential_id=new_n8n_credential_id,
            n8n_credential_type=option["n8n_credential_type"],
            n8n_connection_id=n8n.connection_id,
            auth_option_id=option["option_id"],
            connection_pattern=PATTERN_LABELS[option["connection_pattern"]],
            oauth_pending=True,
            is_active=False,
        )
        db.add(existing)
        db.commit()
        db.refresh(existing)

    try:
        auth_url = await n8n.get_oauth2_authorization_url(new_n8n_credential_id)
    except N8N_ERRORS as e:
        # credential shell exists but we couldn't get the auth URL -- leave the pending row in
        # place (user can retry) rather than silently losing track of the half-created credential
        raise n8n_http_error(
            "get_oauth2_authorization_url",
            e,
            "The credential was created but n8n did not return the authorization URL. Try again",
        ) from None

    return {
        "service": service,
        "auth_option": option["option_id"],
        "n8n_credential_id": new_n8n_credential_id,
        "authorization_url": auth_url,
    }


async def check_oauth_status(
    db: Session, user_id: uuid.UUID, service: str, *, n8n: N8nClient
) -> dict:
    """
    Polls n8n for whether the pending OAuth connection has completed. Call this from the
    frontend while the consent popup is open (or once it closes) -- there is no push-based
    callback into OmniAgent, since the provider redirects straight to n8n's own callback URL.
    """
    row = (
        db.query(Integration)
        .filter(Integration.user_id == user_id, Integration.service == service)
        .first()
    )
    if not row:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"'{service}' has no connection in progress"
        )

    if is_stale(row.n8n_connection_id, n8n.connection_id):
        # Pending on an instance the user has since replaced: nothing to poll here.
        return {"service": service, "connected": False, "pending": False}

    if not row.oauth_pending:
        return {"service": service, "connected": row.is_active, "pending": False}

    try:
        connected = await n8n.is_oauth_credential_connected(row.n8n_credential_id)
    except N8N_ERRORS as e:
        raise n8n_http_error(
            "is_oauth_credential_connected",
            e,
            "Could not check the connection status in n8n",
        ) from None
    if connected:
        row.oauth_pending = False
        row.is_active = True
        db.commit()
        db.refresh(row)

    return {
        "service": service,
        "connected": row.is_active,
        "pending": row.oauth_pending,
    }
