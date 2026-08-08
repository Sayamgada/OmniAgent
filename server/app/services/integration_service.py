import uuid
from sqlalchemy.orm import Session

from app.models.integration import Integration
from app.utils.integration_catalog import CATALOG_BY_SERVICE, INTEGRATION_CATALOG, is_oauth_connect_available
from app.utils.n8n_credential_types import get_n8n_credential_type
from app.utils.n8n_field_maps import translate_fields_for_n8n
from app.utils.n8n_client import create_n8n_credential, delete_n8n_credential, N8nClientError


def _credential_name(user_id: uuid.UUID, service: str) -> str:
    """Deterministic, human-inspectable credential name in the n8n UI.
    Not used for lookups — n8n_credential_id is the actual reference — but makes
    debugging in the n8n dashboard sane once there are many users' credentials in there."""
    return f"omniagent-{user_id}-{service}"


def upsert_integration(db: Session, user_id: uuid.UUID, service: str, credentials: dict) -> Integration:
    """
    Case 1 path (api_key / static-field services) and the storage half of Case 2
    (OAuth) once a token has already been acquired — both end up here with a flat
    `credentials` dict of whatever fields that service's n8n credential type expects.

    Flow: push to n8n first, only write to Postgres if that succeeds. This avoids
    the partial-failure state flagged earlier — a Postgres row pointing at a
    credential that was never actually created in n8n.
    """
    catalog_entry = CATALOG_BY_SERVICE.get(service)
    if not catalog_entry:
        raise ValueError(f"Unknown service '{service}' — not in INTEGRATION_CATALOG")

    display_name = catalog_entry["display_name"]
    connection_type = catalog_entry["connection_type"]
    n8n_type = get_n8n_credential_type(service)  # raises KeyError if unmapped — see n8n_credential_types.py

    existing = (
        db.query(Integration)
        .filter(Integration.user_id == user_id, Integration.service == service)
        .first()
    )

    # If reconnecting (existing row with a live n8n credential), delete the old
    # n8n credential before creating a new one — avoids orphaned credentials
    # accumulating in n8n every time a user updates their key.
    if existing and existing.n8n_credential_id:
        try:
            delete_n8n_credential(existing.n8n_credential_id)
        except N8nClientError:
            # Old credential may already be gone or n8n may be briefly unreachable —
            # don't block the new connection attempt on cleanup of the old one.
            pass

    try:
        credential_id = create_n8n_credential(
            name=_credential_name(user_id, service),
            credential_type=n8n_type,
            data=translate_fields_for_n8n(service, credentials),
        )
    except N8nClientError as e:
        # Nothing written to Postgres — the failure is surfaced as-is to the router,
        # which turns it into a clean HTTP error for the frontend.
        raise

    if existing:
        existing.display_name = display_name
        existing.connection_type = connection_type
        existing.n8n_credential_id = credential_id
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing

    new_row = Integration(
        user_id=user_id,
        service=service,
        display_name=display_name,
        connection_type=connection_type,
        n8n_credential_id=credential_id,
        is_active=True,
    )
    db.add(new_row)
    db.commit()
    db.refresh(new_row)
    return new_row


def toggle_integration(db: Session, user_id: uuid.UUID, service: str) -> Integration | None:
    """Soft on/off — flips is_active only. Deliberately does NOT touch the n8n
    credential (it stays live in n8n either way). Use delete_integration for a
    hard disconnect that actually revokes the n8n credential."""
    row = (
        db.query(Integration)
        .filter(Integration.user_id == user_id, Integration.service == service)
        .first()
    )
    if not row:
        return None
    row.is_active = not row.is_active
    db.commit()
    db.refresh(row)
    return row


def delete_integration(db: Session, user_id: uuid.UUID, service: str) -> bool:
    """Hard disconnect: deletes the n8n credential AND the Postgres row.
    This is the fix for the 'credential revocation drift' problem — without this,
    a user disconnecting a service in the UI would leave a live, usable credential
    sitting in n8n indefinitely."""
    row = (
        db.query(Integration)
        .filter(Integration.user_id == user_id, Integration.service == service)
        .first()
    )
    if not row:
        return False

    if row.n8n_credential_id:
        try:
            delete_n8n_credential(row.n8n_credential_id)
        except N8nClientError:
            # Surface this rather than silently swallowing — a failed n8n deletion
            # while we're about to delete the Postgres pointer to it is exactly
            # the drift scenario we're trying to avoid. Let the router decide
            # whether to block the delete or proceed with a warning.
            raise

    db.delete(row)
    db.commit()
    return True


def list_integrations_with_status(db: Session, user_id: uuid.UUID) -> list[dict]:
    rows = (
        db.query(Integration.service, Integration.is_active, Integration.n8n_credential_id)
        .filter(Integration.user_id == user_id)  # no is_active filter — we need both states
        .all()
    )
    status_by_service = {r.service: {"is_active": r.is_active, "has_credential": bool(r.n8n_credential_id)} for r in rows}

    result = []
    for entry in INTEGRATION_CATALOG:
        service = entry["service"]
        row_status = status_by_service.get(service)
        result.append({
            **entry,
            "connected": row_status["is_active"] if row_status else False,
            "configured": row_status is not None and row_status["has_credential"],
            "oauth_connect_available": is_oauth_connect_available(service),
        })
    return result