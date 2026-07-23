from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from langchain_huggingface import HuggingFaceEmbeddings
from pydantic import BaseModel
from langchain_community.vectorstores import FAISS
from app.database import engine, Base, mongo_db
from app.routers.auth import router as auth_router  # Fixed
from app.core.config import settings
from app.routers.agent_router import router as agent_router
from app.services.vectorstore import search_automations
from app.database import get_mongo_db
from fastapi import APIRouter, Depends
from contextlib import asynccontextmanager
Base.metadata.create_all(bind=engine)


async def create_indexes():
    collection = mongo_db["AutomationPreview"]

    await collection.create_index(
        "automation_name",
        unique=True,
        name="idx_automation_name"
    )
@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_indexes()
    yield


app = FastAPI(title="OmniAgent Auth")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Add all
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.include_router(auth_router)
app.include_router(agent_router)

@app.get("/")
def root():
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