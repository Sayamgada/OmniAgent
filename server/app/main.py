from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from langchain_huggingface import HuggingFaceEmbeddings
from pydantic import BaseModel
from langchain_community.vectorstores import FAISS
from app.database import engine, Base
from app.routers.auth import router as auth_router  # Fixed
from app.core.config import settings
from app.routers.gemini import router as gemini_router
FAISS_INDEX_PATH = r"D:\Projects\OmniAgent\server\faiss_index"

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
app.include_router(gemini_router)

# Load once at startup — not per-request
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
vectorstore = FAISS.load_local(
    FAISS_INDEX_PATH,
    embeddings,
    allow_dangerous_deserialization=True  # safe here since you created this index yourself
)

@app.get("/")
def root():
    return {"message": "Auth API ready"}

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    category: str | None = None  # optional filter: "Finance", "Education", "Corporate"

@app.post("/search")
def search(request: SearchRequest):
    if request.category:
        results = vectorstore.similarity_search(
            request.query,
            k=request.top_k,
            filter={"category": request.category}
        )
    else:
        results = vectorstore.similarity_search(request.query, k=request.top_k)

    return {
        "query": request.query,
        "results": [
            {
                "content": doc.page_content,
                "metadata": doc.metadata
            }
            for doc in results
        ]
    }