import uuid
from sqlalchemy.orm import Session
from app.models.integration import Integration


def check_required_integrations(
    db: Session,
    user_id: uuid.UUID,
    required_integrations: list[dict],
) -> list[dict]:
    """
    Cross-checks each required integration against what the user has
    stored and active in Postgres. Only checks presence — never decrypts
    or returns the actual credential value.
    """
    services_needed = [item["service"] for item in required_integrations]
    if not services_needed:
        return []

    rows = (
        db.query(Integration.service)
        .filter(
            Integration.user_id == user_id,
            Integration.service.in_(services_needed),
            Integration.is_active.is_(True),
        )
        .all()
    )
    available_services = {row.service for row in rows}

    return [
        {
            "service": item["service"],
            "display_name": item.get("display_name", item["service"]),
            "required": item.get("required", True),
            "available": item["service"] in available_services,
        }
        for item in required_integrations
    ]