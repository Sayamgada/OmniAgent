from typing import Optional, Any
from pydantic import BaseModel


class IntegrationFieldOut(BaseModel):
    name: str
    display_name: Optional[str] = None
    type: str
    secret: bool
    default: Optional[Any] = None


class AuthOptionOut(BaseModel):
    option_id: str          # e.g. "api_key", "oauth2", "personal_access_token"
    label: str               # human-readable, e.g. "Notion OAuth2 API"
    connection_pattern: int  # 1=text_fields, 2=oauth2, 4=oauth2_extra
    auth_type: str
    fields: list[IntegrationFieldOut]


class CatalogEntryOut(BaseModel):
    """
    Note: services can have MORE THAN ONE valid auth method (e.g. Notion supports both a
    plain API-key integration secret AND a full OAuth2 app). auth_options lists every method
    n8n itself supports; default_option is the one the UI should preselect (simplest non-OAuth
    method where one exists, since it needs no app registration).
    """
    service: str
    display_name: str
    category: str
    default_option: str
    auth_options: list[AuthOptionOut]
    connected: bool = False
    configured: bool = False
    connected_option: Optional[str] = None  # which auth_option this user actually connected with


class ConnectTextFieldsRequest(BaseModel):
    """Pattern 1 (or pattern 1 branch of a multi-option service): user pastes raw values."""
    service: str
    option_id: Optional[str] = None  # omit to use the catalog's default_option
    values: dict[str, str]  # field name (camelCase, matching catalog) -> value


class IntegrationOut(BaseModel):
    service: str
    display_name: Optional[str]
    connection_pattern: str
    is_active: bool

    class Config:
        from_attributes = True


class RequiredIntegration(BaseModel):
    service: str
    display_name: Optional[str] = None
    required: bool = True


class CheckIntegrationsRequest(BaseModel):
    required_integrations: list[RequiredIntegration]


class IntegrationStatus(BaseModel):
    service: str
    display_name: Optional[str] = None
    required: bool
    connected: bool


class CheckIntegrationsResponse(BaseModel):
    integrations: list[IntegrationStatus]
    all_required_available: bool


# ---------------- OAuth2 (pattern 2 / pattern 4) ----------------

class OAuthConnectInitRequest(BaseModel):
    """
    Kicks off an OAuth2 connection. client_id/client_secret are the user's OWN OAuth app
    credentials (registered by them on the provider's developer console, with n8n's fixed
    callback URL as the authorized redirect URI -- see N8N_OAUTH_REDIRECT_URI). extra_fields
    covers pattern-4 non-secret extras (e.g. GitHub's "server", Salesforce's "environment").
    """
    service: str
    option_id: Optional[str] = None  # omit to use the catalog's default_option
    client_id: str
    client_secret: str
    extra_fields: dict[str, str] = {}


class OAuthConnectInitResponse(BaseModel):
    service: str
    auth_option: str
    n8n_credential_id: str
    authorization_url: str  # frontend should send the user's browser here (new tab/popup)


class OAuthStatusResponse(BaseModel):
    service: str
    connected: bool
    pending: bool