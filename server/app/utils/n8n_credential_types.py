"""
app/utils/n8n_credential_types.py

Maps OmniAgent's catalog `service` key -> n8n's internal credential `type` string.
This is NOT the same value — e.g. our "gmail" maps to n8n's "gmailOAuth2".

IMPORTANT: only entries below have been verified (either tested directly, like
gmailOAuth2, or taken from n8n's own credential list naming convention with high
confidence). Do NOT assume an unlisted service's n8n type by guessing — confirm via:

    GET {N8N_BASE_URL}/api/v1/credentials/schema/{guessed_type}

against your running n8n instance before adding it here. An incorrect type string
will fail at n8n credential-creation time, not silently — but better to catch it
here with a clear KeyError than debug a 400 from n8n later.
"""

N8N_CREDENTIAL_TYPE_MAP = {
    # --- Registered OAuth (Google suite) ---
    "gmail": "gmailOAuth2",
    "google_calendar": "googleCalendarOAuth2Api",
    "drive": "googleDriveOAuth2Api",
    "google_docs": "googleDocsOAuth2Api",
    "google_sheets": "googleSheetsOAuth2Api",
    "google_sheets_trigger": "googleSheetsTriggerOAuth2Api",
    "google_slides": "googleSlidesOAuth2Api",
    "google_contacts": "googleContactsOAuth2Api",
    "google_tasks": "googleTasksOAuth2Api",

    # --- AI providers (api_key type, used by the Groq generator today) ---
    "groq": "groqApi",
    "openai": "openAiApi",
    "anthropic": "anthropicApi",
    "cohere": "cohereApi",
    "mistral": "mistralCloudApi",
    "google_gemini": "googlePalmApi",

    # --- Common static-field services likely to appear early ---
    "postgresql": "postgres",
    "mysql": "mySql",
    "mongodb": "mongoDb",
    "slack": "slackApi",
    "notion": "notionApi",
    "github": "githubApi",
    "stripe_mcp": "stripeApi",  # NOTE: verify — Stripe is listed as MCP-only in our catalog;
                                  # if a non-MCP Stripe API credential type exists separately,
                                  # confirm before using this key for api_key-style Stripe access.
}


def get_n8n_credential_type(service: str) -> str:
    """Raises KeyError with a clear message if the service isn't mapped yet —
    intentionally loud rather than guessing, per the note above."""
    if service not in N8N_CREDENTIAL_TYPE_MAP:
        raise KeyError(
            f"No verified n8n credential type mapped for service '{service}'. "
            f"Confirm the correct type string against the running n8n instance "
            f"(GET /api/v1/credentials/schema/<type>) and add it to "
            f"N8N_CREDENTIAL_TYPE_MAP before this service can be connected."
        )
    return N8N_CREDENTIAL_TYPE_MAP[service]