from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from langchain_huggingface import HuggingFaceEmbeddings
from pydantic import BaseModel
from langchain_community.vectorstores import FAISS
from app.database import engine, Base, mongo_db
from app.models.user import User
from app.models.integration import Integration
from app.models.agent import Agent
from app.routers.auth import router as auth_router  # Fixed
from app.core.config import settings
from app.routers.agent_router import router as agent_router
from app.routers.agent_management_router import router as agent_management_router
from app.routers.integration_router import router as integration_router
from app.services.vectorstore import search_automations, printVectorStore
from app.database import get_mongo_db
from fastapi import APIRouter, Depends
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger("uvicorn.error")


async def create_indexes():
    try:
        collection = mongo_db["AutomationPreview"]
        await collection.create_index(
            "automation_name",
            unique=True,
            name="idx_automation_name"
        )
        logger.info("MongoDB indexes verified successfully.")
    except Exception as e:
        logger.error(f"MongoDB index verification failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing PostgreSQL schema and connections...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("PostgreSQL database tables verified successfully.")
    except Exception as e:
        logger.error(f"PostgreSQL initialization failed: {e}")
        raise

    await create_indexes()
    yield


app = FastAPI(title="OmniAgent Auth", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # Add all
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.include_router(auth_router)
app.include_router(agent_router)
app.include_router(agent_management_router)
app.include_router(integration_router)

@app.get("/")
def root():
    printVectorStore()
    return {"message": "OmniAgent Running"}


@app.get("/search")
def search_automations_api(
    query: str,
    category: str | None = None,
    top_k: int = 5
):
    if not query or not query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query parameter cannot be empty"
        )

    try:
        results = search_automations(
            query=query,
            category=category,
            top_k=top_k
        )

        return {
            "query": query,
            "results": results
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )