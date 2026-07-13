from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from pymongo import AsyncMongoClient

from .core.config import settings

# ---------------- PostgreSQL ----------------

engine = create_engine(settings.POSTGRE_DB_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_postgres_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------- MongoDB ----------------

mongo_client = AsyncMongoClient(settings.MONGO_DB_URL)
mongo_db = mongo_client[settings.MONGO_DB_NAME]

def get_mongo_db():
    return mongo_db