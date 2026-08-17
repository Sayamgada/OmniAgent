import uuid

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.integration import Integration
from app.core.integration_catalog import INTEGRATION_CATALOG, get_auth_option
from app.services import n8n_client

PATTERN_LABELS = {1: "text_fields", 2: "oauth2", 3: "mcp_oauth", 4: "oauth2_extra"}


def _get_catalog_entry(service: str) -> dict:
    entry = INTEGRATION_CATALOG.get(service)
    if not entry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown service '{service}' — not in integration catalog")
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


def _validate_text_fields(service: str, option: dict, values: dict) -> dict:
    """
    Checks the submitted values cover every required field the chosen auth_option defines,
    and drops anything not in that option's field list (never forward arbitrary extra keys
    to n8n). Returns the n8n-ready data payload (field name -> value, already camelCase).
    """
    if option["connection_pattern"] != 1:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"'{service}' auth option '{option['option_id']}' is not a text-fields method "
            f"(pattern {option['connection_pattern']}); use the OAuth connect flow instead.",
        )

    option_field_names = {f["name"] for f in option["fields"]}
    missing = option_field_names - values.keys()
    if missing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Missing required field(s) for '{service}' ({option['option_id']}): {sorted(missing)}",
        )

    return {k: v for k, v in values.items() if k in option_field_names}


async def connect_text_fields(
    db: Session, user_id: uuid.UUID, service: str, values: dict, option_id: str | None = None
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
    n8n_cred = await n8n_client.create_credential(
        name=credential_name,
        credential_type=option["n8n_credential_type"],
        data=n8n_data,
    )
    new_n8n_credential_id = n8n_cred["id"]

    if existing:
        # replace: delete the old n8n credential first (best-effort), then point at the new one.
        # Switching auth_option (e.g. api_key -> oauth2) on reconnect is allowed -- the row just
        # repoints to the new credential type.
        try:
            await n8n_client.delete_credential(existing.n8n_credential_id)
        except n8n_client.N8nClientError:
            pass  # old credential may already be gone/invalid -- don't block the new save
        existing.n8n_credential_id = new_n8n_credential_id
        existing.n8n_credential_type = option["n8n_credential_type"]
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
        auth_option_id=option["option_id"],
        connection_pattern=PATTERN_LABELS[option["connection_pattern"]],
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


async def disconnect_integration(db: Session, user_id: uuid.UUID, service: str) -> None:
    row = (
        db.query(Integration)
        .filter(Integration.user_id == user_id, Integration.service == service)
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"'{service}' is not connected")
    try:
        await n8n_client.delete_credential(row.n8n_credential_id)
    except n8n_client.N8nClientError:
        pass  # already deleted on n8n's side -- don't block removing our own record
    db.delete(row)
    db.commit()


def list_integrations_with_status(db: Session, user_id: uuid.UUID) -> list[dict]:
    connected_rows = {
        r.service: r for r in db.query(Integration).filter(Integration.user_id == user_id).all()
    }
    out = []
    for service, entry in INTEGRATION_CATALOG.items():
        row = connected_rows.get(service)
        out.append({
            "service": entry["service"],
            "display_name": entry["display_name"],
            "category": entry["category"],
            "default_option": entry["default_option"],
            "auth_options": entry["auth_options"],
            "connected": bool(row and row.is_active),
            "configured": row is not None,
            "connected_option": row.auth_option_id if row else None,
        })
    return out


def check_required_integrations(db: Session, user_id: uuid.UUID, required: list[dict]) -> dict:
    connected_services = {
        r.service
        for r in db.query(Integration).filter(Integration.user_id == user_id, Integration.is_active == True).all()
    }
    statuses = []
    all_available = True
    for req in required:
        is_connected = req["service"] in connected_services
        if req.get("required", True) and not is_connected:
            all_available = False
        statuses.append({
            "service": req["service"],
            "display_name": req.get("display_name"),
            "required": req.get("required", True),
            "connected": is_connected,
        })
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

    # only forward extra fields the catalog actually defines for this option (excluding
    # clientId/clientSecret, which are handled explicitly, not user-suppliable arbitrary keys)
    known_extra_names = {f["name"] for f in option["fields"]}
    unknown = set(extra_fields.keys()) - known_extra_names
    if unknown:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unknown extra field(s) for '{service}' ({option['option_id']}): {sorted(unknown)}. "
            f"Expected a subset of: {sorted(known_extra_names)}",
        )

    n8n_data = {"clientId": client_id, "clientSecret": client_secret, **extra_fields}

    existing = (
        db.query(Integration)
        .filter(Integration.user_id == user_id, Integration.service == service)
        .first()
    )

    credential_name = f"omniagent-{service}-{option['option_id']}-{str(user_id)[:8]}"
    n8n_cred = await n8n_client.create_credential(
        name=credential_name,
        credential_type=option["n8n_credential_type"],
        data=n8n_data,
    )
    new_n8n_credential_id = n8n_cred["id"]

    if existing:
        try:
            await n8n_client.delete_credential(existing.n8n_credential_id)
        except n8n_client.N8nClientError:
            pass
        existing.n8n_credential_id = new_n8n_credential_id
        existing.n8n_credential_type = option["n8n_credential_type"]
        existing.auth_option_id = option["option_id"]
        existing.display_name = entry["display_name"]
        existing.connection_pattern = PATTERN_LABELS[option["connection_pattern"]]
        existing.oauth_pending = True
        existing.is_active = False  # not truly connected until the status poll confirms it
        db.commit()
        db.refresh(existing)
    else:
        existing = Integration(
            user_id=user_id,
            service=service,
            display_name=entry["display_name"],
            n8n_credential_id=new_n8n_credential_id,
            n8n_credential_type=option["n8n_credential_type"],
            auth_option_id=option["option_id"],
            connection_pattern=PATTERN_LABELS[option["connection_pattern"]],
            oauth_pending=True,
            is_active=False,
        )
        db.add(existing)
        db.commit()
        db.refresh(existing)

    try:
        auth_url = await n8n_client.get_oauth2_authorization_url(new_n8n_credential_id)
    except n8n_client.N8nClientError:
        # credential shell exists but we couldn't get the auth URL -- leave the pending row in
        # place (user can retry) rather than silently losing track of the half-created credential
        raise

    return {
        "service": service,
        "auth_option": option["option_id"],
        "n8n_credential_id": new_n8n_credential_id,
        "authorization_url": auth_url,
    }


async def check_oauth_status(db: Session, user_id: uuid.UUID, service: str) -> dict:
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
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"'{service}' has no connection in progress")

    if not row.oauth_pending:
        return {"service": service, "connected": row.is_active, "pending": False}

    connected = await n8n_client.is_oauth_credential_connected(row.n8n_credential_id)
    if connected:
        row.oauth_pending = False
        row.is_active = True
        db.commit()
        db.refresh(row)

    return {"service": service, "connected": row.is_active, "pending": row.oauth_pending}