from typing import Optional
from pydantic import BaseModel


class AIProviderOut(BaseModel):
    """One selectable LLM provider for the AI step of a generated workflow."""

    service: str  # catalog / registry key, e.g. "groq"
    display_name: str
    default_model: str
    models: list[str]  # curated list; users may also type a custom ID if allowed
    allow_custom_model: bool
    # Whether this user has an active credential for the provider on their current n8n
    # instance (same rule as POST /integrations/check).
    connected: bool
    # False when the registry cannot resolve a chat-model node for this provider (e.g. after an
    # n8n upgrade); the UI should disable it rather than offer a provider that cannot compile.
    available: bool
    node_type: Optional[str] = None
    node_type_version: Optional[float] = None
