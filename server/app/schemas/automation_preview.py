from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class Integration(BaseModel):
    service: str
    display_name: str
    required: bool = True


class AutomationPreviewCreate(BaseModel):
    automation_name: str
    automation_description: str

    required_integrations: list[Integration]

    preview_json: dict[str, Any]


class AutomationPreviewInDB(AutomationPreviewCreate):
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC)
    )