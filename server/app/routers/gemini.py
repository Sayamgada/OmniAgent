# app/routers/agents.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.auth import get_current_user  # assuming you have this
from app.models.user import User
from app.services.gemini import generate_workflow_from_prompt

router = APIRouter(prefix="/agents", tags=["agents"])


class WorkflowRequest(BaseModel):
    prompt: str


class WorkflowResponse(BaseModel):
    workflow: str


@router.post("/extract-workflow", response_model=WorkflowResponse)
async def extract_workflow(
    body: WorkflowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        workflow = await generate_workflow_from_prompt(body.prompt)
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini did not return any content",
            )
        return WorkflowResponse(workflow=workflow)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error while calling Gemini API",
        )