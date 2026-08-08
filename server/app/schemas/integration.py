from pydantic import BaseModel


class IntegrationCatalogItem(BaseModel):
    """One entry in GET /integrations — catalog data merged with this user's
    connection status. Matches INTEGRATION_CATALOG's shape exactly (no
    `description` field — the new 492-service catalog doesn't have one)."""
    service: str
    display_name: str
    category: str
    connection_type: str          # "api_key" | "oauth" | "oauth_extra" | "mcp_oauth"
    fields: list[str]
    connected: bool
    configured: bool
    oauth_connect_available: bool  # True only for oauth/oauth_extra services OmniAgent
                                     # has actually registered an app for (see
                                     # OAUTH_APPS_REGISTERED). False for api_key/mcp_oauth
                                     # (meaningless there) and for unregistered oauth services
                                     # (frontend should fall back to manual paste, or — for
                                     # now — show "not yet supported" if no fallback form exists).


class IntegrationUpsertRequest(BaseModel):
    """POST /integrations body — manual credential-field submission
    (api_key services, or oauth_extra's non-token fields, or a manually
    pasted token for an oauth service that isn't in OAUTH_APPS_REGISTERED)."""
    service: str
    credentials: dict[str, str]


class IntegrationUpsertResponse(BaseModel):
    service: str
    display_name: str
    connected: bool


class RequiredIntegration(BaseModel):
    """One entry in the `required_integrations` list a generated workflow
    returns — matches the shape from workflow_generator's output contract."""
    service: str
    display_name: str
    required: bool


class CredentialCheckRequest(BaseModel):
    required_integrations: list[RequiredIntegration]


class IntegrationAvailability(BaseModel):
    service: str
    display_name: str
    required: bool
    available: bool


class CredentialCheckResponse(BaseModel):
    all_required_available: bool
    integrations: list[IntegrationAvailability]