# app/routers/gemini.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Literal

from app.database import get_postgres_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.llm_service import generate_workflow_from_prompt
from app.services.vectorstore import search_automations

router = APIRouter(prefix="/agents", tags=["agents"])

Domain = Literal["Corporate", "Education", "Finance"]

class WorkflowRequest(BaseModel):
    domain: Domain
    description: str = Field(..., min_length=3)
    top_k: int = 5


class WorkflowResponse(BaseModel):
    workflow: dict


@router.post("/extract-workflow", response_model=WorkflowResponse)
async def extract_workflow(
    body: WorkflowRequest,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    try:
        docs = search_automations(query=body.description, category=body.domain, top_k=body.top_k)
        context = "\n\n".join(doc.page_content for doc in docs) if docs else ""

        workflow = await generate_workflow_from_prompt(
            domain=body.domain,
            description=body.description,
            context=context,
        )

        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Groq did not return any content",
            )
        return WorkflowResponse(workflow=workflow)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error while calling Groq API",
        )