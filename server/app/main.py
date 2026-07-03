from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from langchain_huggingface import HuggingFaceEmbeddings
from pydantic import BaseModel
from langchain_community.vectorstores import FAISS
from app.database import engine, Base
from app.routers.auth import router as auth_router  # Fixed
from app.core.config import settings
from app.routers.llm_router import router as llm_router

Base.metadata.create_all(bind=engine)

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
app.include_router(llm_router)

@app.get("/")
def root():
    return {"message": "Auth API ready"}

