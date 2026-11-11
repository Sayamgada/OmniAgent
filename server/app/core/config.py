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
    FAISS_INDEX_PATH: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "faiss_index")
    )
    GROQ_API_KEY: str

    GEMINI_API_KEY: str

    MONGO_DB_URL: str
    MONGO_DB_NAME: str

    # Fernet key: used ONLY to encrypt-at-rest the short-lived client_id/client_secret a user
    # supplies in PendingOAuthConnection between form-submit and OAuth callback. Not used for
    # Integration rows anymore -- those store only n8n_credential_id, no raw secrets.
    FERNET_SECRET_KEY: str

    FRONTEND_BASE_URL: str

    N8N_ALLOW_PRIVATE_HOSTS: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
