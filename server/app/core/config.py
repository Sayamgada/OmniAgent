from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    POSTGRE_DB_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str

    EMBEDDING_MODEL: str = "BAAI/bge-base-en-v1.5"
    FAISS_INDEX_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "faiss_index"))
    GROQ_API_KEY: str

    MONGO_DB_URL: str
    MONGO_DB_NAME: str

    # Fernet key: used ONLY to encrypt-at-rest the short-lived client_id/client_secret a user
    # supplies in PendingOAuthConnection between form-submit and OAuth callback. Not used for
    # Integration rows anymore -- those store only n8n_credential_id, no raw secrets.
    FERNET_SECRET_KEY: str

    # n8n instance OmniAgent talks to via its Credentials API. Not provider-specific --
    # every OAuth2 credential in n8n (Google, GitHub, Slack, ...) uses this same fixed
    # self-hosted callback route, since it's n8n's own route, not each provider's.
    N8N_BASE_URL: str
    N8N_API_KEY: str
    N8N_OAUTH_REDIRECT_URI: str

    # n8n owner account credentials. OmniAgent logs in as this account ONCE and caches the
    # resulting session cookie, then reuses it to call n8n's internal (non-public-API) OAuth2
    # endpoints -- /rest/oauth2-credential/auth (get the authorization URL for a credential) and
    # /rest/credentials/{id}?includeData=true (poll whether that credential now has tokens).
    # These internal routes are what n8n's own frontend uses; they are NOT part of the public
    # /api/v1 surface and are NOT reachable with N8N_API_KEY -- they require a real session.
    N8N_OWNER_EMAIL: str
    N8N_OWNER_PASSWORD: str

    FRONTEND_BASE_URL: str

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()