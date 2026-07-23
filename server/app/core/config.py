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

    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()