from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Literal
from app.services.workflow_storage import store_generated_workflow
from app.database import get_postgres_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.vectorstore import search_automations
from app.services.workflow_generator import (
    generate_groq_workflow,
    fetch_mongo_workflow,
)

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

        docs = search_automations(
            query=body.description,
            category=body.domain,
            top_k=body.top_k,
        )

        if not docs:

            workflow = await generate_groq_workflow(
                domain=body.domain,
                description=body.description,
                context="",
            )
            await store_generated_workflow(workflow)
        else:

            best_doc = max(
                docs,
                key=lambda x: x["similarity_score"],
            )

            max_score = best_doc["similarity_score"]

            if max_score >= 0.85:

                workflow = await fetch_mongo_workflow(
                    automation_name=best_doc["automation_name"],
                    automation_description=best_doc["description"],
                    domain=body.domain,
                    user_description=body.description,
                    context=context,
                )

            else:

                context = "\n\n".join(
                    f"Automation Name: {doc['automation_name']}\n"
                    f"Automation Description: {doc['description']}"
                    for doc in docs
                )

                workflow = await generate_groq_workflow(
                    domain=body.domain,
                    description=body.description,
                    context=context,
                )
                await store_generated_workflow(workflow)

        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Error generating workflow",
            )

        return WorkflowResponse(workflow=workflow)
    except HTTPException:
        raise

    except Exception as e:
        print(e)

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error while processing workflow",
        )