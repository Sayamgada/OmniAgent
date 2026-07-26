from pydantic import BaseModel


class IntegrationStatus(BaseModel):
    service: str
    display_name: str
    required: bool
    available: bool


class CredentialCheckRequest(BaseModel):
    required_integrations: list[dict]


class CredentialCheckResponse(BaseModel):
    all_required_available: bool
    integrations: list[IntegrationStatus]