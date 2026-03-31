from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers.auth import router as auth_router  # Fixed

Base.metadata.create_all(bind=engine)

app = FastAPI(title="OmniAgent Auth")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Add all
    allow_headers=["*"],
)
app.include_router(auth_router)

@app.get("/")
def root():
    return {"message": "Auth API ready"}