import json
from sqlalchemy.orm import Session
from app.models.integration import Integration
from app.core.integration_catalog import CATALOG_BY_SERVICE, INTEGRATION_CATALOG
from app.utils.crypto import encrypt_value


def upsert_integration(db: Session, user_id, service: str, credentials: dict) -> Integration:
    catalog_entry = CATALOG_BY_SERVICE.get(service)
    display_name = catalog_entry["display_name"] if catalog_entry else service

    encrypted = encrypt_value(json.dumps(credentials))

    existing = (
        db.query(Integration)
        .filter(Integration.user_id == user_id, Integration.service == service)
        .first()
    )

    if existing:
        existing.encrypted_credentials = encrypted
        existing.display_name = display_name
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing

    new_row = Integration(
        user_id=user_id,
        service=service,
        display_name=display_name,
        encrypted_credentials=encrypted,
        is_active=True,
    )
    db.add(new_row)
    db.commit()
    db.refresh(new_row)
    return new_row


def toggle_integration(db: Session, user_id, service: str) -> Integration | None:
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


def list_integrations_with_status(db: Session, user_id) -> list[dict]:
    rows = (
        db.query(Integration.service, Integration.is_active)
        .filter(Integration.user_id == user_id)   # no is_active filter — we need both states
        .all()
    )
    status_by_service = {row.service: row.is_active for row in rows}

    return [
        {
            **entry,
            "connected": status_by_service.get(entry["service"], False),
            "configured": entry["service"] in status_by_service,
        }
        for entry in INTEGRATION_CATALOG
    ]