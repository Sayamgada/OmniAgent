from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Literal
from app.services.workflow_storage import store_generated_workflow, store_generated_workflow_mongo
from app.database import get_postgres_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.vectorstore import search_automations
from app.services.credential_checker import check_required_integrations
from app.services.workflow_generator import (
    generate_groq_workflow,
    fetch_mongo_workflow,
)

router = APIRouter(prefix="/agents", tags=["agents"])

Domain = Literal["Corporate", "Education", "Finance"]

# Must match the "schema_version" value embedded in workflow_generator.py's
# SYSTEM_INSTRUCTION output schema. Bump both together on any future breaking
# IR schema change.
CURRENT_SCHEMA_VERSION = 2


class WorkflowRequest(BaseModel):
    domain: Domain
    description: str = Field(..., min_length=3)
    top_k: int = 5

class WorkflowResponse(BaseModel):
    workflow: dict
    integrations: list[dict]
    all_required_available: bool

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
            await store_generated_workflow(workflow, body.domain)
        else:

            best_doc = max(docs, key=lambda d: d["similarity_score"])
            context = "\n\n".join(
                                f"Automation Name: {doc['automation_name']}\n"
                                f"Automation Description: {doc['description']}"
                                for doc in docs
                            )
            print(best_doc)
            if best_doc["similarity_score"] >= 0.75:
                print("similarity")

                workflow = await fetch_mongo_workflow(
                    automation_name=best_doc["automation_name"],
                    automation_description=best_doc["description"]
                )

                print(workflow)

                if workflow is None:
                    print("not workflow")
                    workflow = await generate_groq_workflow(
                        domain=body.domain,
                        description=body.description,
                        context=context,
                    )

                    await store_generated_workflow_mongo(workflow)

            else:
                print("no similarity")
                workflow = await generate_groq_workflow(
                    domain=body.domain,
                    description=body.description,
                    context=context,
                )

                await store_generated_workflow(workflow, body.domain)

        if not workflow:
            raise HTTPException(...)

        integration_status = check_required_integrations(
            db=db,
            user_id=current_user.id,
            required_integrations=workflow["required_integrations"],
        )

        return WorkflowResponse(
            workflow=workflow,
            integrations=integration_status,
            all_required_available=all(
                r["available"] for r in integration_status if r["required"]
            ),
        )
    except HTTPException:
        raise

    except Exception as e:
        print(e)

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error while processing workflow",
        )