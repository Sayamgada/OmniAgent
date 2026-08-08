"""
app/utils/n8n_field_maps.py

n8n's Credentials API expects specific (usually camelCase) key names per
credential type — these don't always match our catalog's snake_case `fields`
list, which exists for display/labeling purposes. This module translates
between the two before a payload is sent to n8n.

Same caution as n8n_credential_types.py: only entries below are verified.
An unmapped field is passed through unchanged, which works for services where
our name already happens to match n8n's (rare — verify before assuming).
"""

# Per-service overrides: {our_field_name: n8n_field_name}
# Only needed where the service's mapping differs from FIELD_NAME_FALLBACK.
N8N_FIELD_MAP: dict[str, dict[str, str]] = {
    "groq": {"api_key": "apiKey"},
    "openai": {"api_key": "apiKey", "organization_id": "organizationId", "base_url": "baseURL"},
    "anthropic": {"api_key": "apiKey", "base_url": "baseURL"},
    "cohere": {"api_key": "apiKey"},
    "mistral": {"api_key": "apiKey"},
    "google_gemini": {"api_key": "apiKey", "host": "host"},

    "postgresql": {
        "host": "host", "database": "database", "user": "user",
        "password": "password", "max_connections": "maxConnections",
        "ignore_ssl_issues": "allowUnauthorizedCerts",
    },
    "mysql": {"host": "host", "database": "database", "user": "user", "password": "password", "port": "port"},
    "mongodb": {"database": "database"},  # connection_string field needs its own handling — see note below

    "slack": {"access_token": "accessToken", "signature_secret": "signatureSecret"},
    "notion": {"internal_integration_secret": "apiKey"},
    "github": {"access_token": "accessToken", "user": "user", "github_server (default: https://api.github.com)": "server"},
}

# Fallback for any service NOT in the map above — our most common field name
# is "api_key", and the overwhelming majority of n8n's simple api-key credential
# types use "apiKey". This is a reasonable default, NOT a verified guarantee —
# if a new service's connect attempt 400s with a "not allowed" / "requires
# property" error like the Groq one, that's the signal to add an explicit
# entry above rather than trust this fallback further.
FIELD_NAME_FALLBACK = {
    "api_key": "apiKey",
    "access_token": "accessToken",
    "client_id": "clientId",
    "client_secret": "clientSecret",
    "refresh_token": "refreshToken",
}


def translate_fields_for_n8n(service: str, credentials: dict) -> dict:
    """Rewrites `credentials` keys into whatever n8n's Credentials API expects
    for this service's credential type. Keys not found in either the
    per-service map or the fallback are passed through unchanged (best-effort,
    not a guarantee — see module docstring)."""
    service_map = N8N_FIELD_MAP.get(service, {})
    translated = {}
    for key, value in credentials.items():
        n8n_key = service_map.get(key) or FIELD_NAME_FALLBACK.get(key) or key
        translated[n8n_key] = value
    return translated