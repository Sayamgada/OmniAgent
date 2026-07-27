from pydantic import BaseModel


class IntegrationCatalogItem(BaseModel):
    service: str
    display_name: str
    category: str
    description: str
    fields: list[str]
    connected: bool


class IntegrationUpsertRequest(BaseModel):
    service: str
    credentials: dict[str, str]


class IntegrationUpsertResponse(BaseModel):
    service: str
    display_name: str
    connected: bool


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

class IntegrationCatalogItem(BaseModel):
    service: str
    display_name: str
    category: str
    description: str
    fields: list[str]
    connected: bool
    configured: bool   # NEW — true if the user has ever saved credentials, regardless of on/off