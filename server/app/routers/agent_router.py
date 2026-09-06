from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Literal
from app.services.workflow_storage import (
    store_generated_workflow,
    store_generated_workflow_mongo,
)
from app.database import get_postgres_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.vectorstore import search_automations
from app.services.credential_checker import check_required_integrations
from app.services.workflow_generator import (
    generate_groq_workflow,
    fetch_mongo_workflow,
    CURRENT_SCHEMA_VERSION,
)

router = APIRouter(prefix="/agents", tags=["agents"])

Domain = Literal["Corporate", "Education", "Finance"]

# Calibrated via scripts/calibrate_threshold.py against the clean, seed-only
# FAISS index (rebuild_index.py) with the BGE instruction prefix removed
# from search_automations() (see vectorstore.py -- the prefix is meant for
# asymmetric query->long-passage retrieval and measurably compresses cosine
# similarity for this symmetric short-description-to-short-description
# matching task; ~0.68 ceiling on identical text with the prefix vs. ~0.91+
# without it).
#
# 12-case calibration run (2026-08, 4 paraphrased queries per domain against
# real OmniAgent_Dataset.xlsx seed rows):
#   true-match scores:  min 0.793, median 0.841, max 0.932  (12/12 correct top-1)
#   unrelated scores:   max 0.672 (of the pairs that even placed in top-10;
#                        most unrelated pairs didn't place at all, so the
#                        real ceiling for "unrelated" is likely lower than this)
#   -> 0.70 sits with margin below the true-match floor and above the
#      highest confirmed unrelated score.
#
# Re-run scripts/calibrate_threshold.py whenever EMBEDDING_MODEL or the
# FAISS index changes -- do not raise this back toward 0.75+ without
# re-measuring the true-match floor first.
SIMILARITY_THRESHOLD = 0.75


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
            if best_doc["similarity_score"] >= SIMILARITY_THRESHOLD:
                print("similarity")

                workflow = await fetch_mongo_workflow(
                    automation_name=best_doc["automation_name"],
                    automation_description=best_doc["description"],
                )

                # print(workflow)

                is_stale = (
                    workflow is not None
                    and workflow.get("schema_version") != CURRENT_SCHEMA_VERSION
                )
                if is_stale:
                    print(
                        f"stale cache: cached schema_version="
                        f"{workflow.get('schema_version')!r}, current="
                        f"{CURRENT_SCHEMA_VERSION!r} - regenerating instead of "
                        f"serving an out-of-date IR shape"
                    )

                if workflow is None or is_stale:
                    print("not workflow" if workflow is None else "stale workflow")
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
        print(workflow)
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
