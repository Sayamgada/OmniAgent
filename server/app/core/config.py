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

    FERNET_SECRET_KEY: str

    N8N_GOOGLE_CLIENT_ID: str
    N8N_GOOGLE_CLIENT_SECRET: str
    N8N_BASE_URL: str
    N8N_API_KEY: str
    N8N_GOOGLE_OAUTH_REDIRECT_URI: str
    FRONTEND_BASE_URL: str

    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()