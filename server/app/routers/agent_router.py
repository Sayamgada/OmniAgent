import dataclasses
import traceback
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

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
from app.services.automation_preview_service import AutomationPreviewService
from app.compiler import (
    SuppliedParamProvider,
    build_param_form,
    compile as compile_workflow,
)
from app.compiler.credential_resolver import PostgresCredentialResolver
from app.compiler.loader import preview_to_steps
from app.compiler.models import Overrides, StepOverride
from app.models.agent import Agent
from app.services import n8n_client

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
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Workflow generation returned no result",
            )

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

    except Exception:
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error while processing workflow",
        )


# ---------------------------------------------------------------------------
# Param-schema / create-workflow (Stage 2.2)
#
# Keyed by automation_name, NOT a preview_id -- previews are stored with no
# user_id at all (AutomationPreviewCreate has none, and automation_name has
# a UNIQUE index -- see main.py's create_indexes()), so they are a shared,
# FAISS-cache-backed generation result, not a per-user record. There is
# nothing to check ownership against at this layer; per-user ownership
# starts at the agents table (Stage 2.3), once a user actually creates a
# workflow FROM a preview. extract-workflow's response already returns
# workflow.automation_name, so the frontend has this key with no other
# change needed -- AutomationPreviewService.get_by_name() already exists
# and is the same lookup update_preview()/delete() already use.
# ---------------------------------------------------------------------------


def _to_plain(obj: Any) -> Any:
    """
    Recursively converts compiler dataclasses (ResolvedNode, UnresolvedStep,
    param_form.py's form/field objects, etc.) into plain JSON-serializable
    structures, WITHOUT hardcoding their field names -- this file doesn't
    import param_form.py's dataclass definitions, so this has to work
    generically rather than via a hand-written response schema.
    """
    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        return {k: _to_plain(v) for k, v in dataclasses.asdict(obj).items()}
    if isinstance(obj, dict):
        return {k: _to_plain(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [_to_plain(v) for v in obj]
    return obj


async def _load_steps_for(automation_name: str) -> list:
    preview = await AutomationPreviewService.get_by_name(automation_name)
    if preview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No preview found for automation_name={automation_name!r}",
        )
    # loader.preview_to_steps expects the wrapper dict containing
    # preview_json -- the Mongo doc IS that wrapper as stored (see
    # workflow_storage.py); the leftover _id is harmless, the loader
    # never reads it.
    return preview_to_steps(preview)


class StepOverrideRequest(BaseModel):
    operation: Optional[str] = None
    target: Optional[str] = None


class CreateWorkflowRequest(BaseModel):
    # keyed by step number, matching Overrides/SuppliedParamProvider's own
    # shape -- lets the frontend resubmit exactly what param-schema asked
    # for, plus optional operation/target picks for any step that came
    # back in needs_user_input as an ambiguous-operation case.
    params: dict[int, dict[str, Any]] = Field(default_factory=dict)
    overrides: dict[int, StepOverrideRequest] = Field(default_factory=dict)
    workflow_name: str = "Generated Workflow"


@router.get("/preview/{automation_name}/param-schema")
async def get_param_schema(
    automation_name: str,
    current_user: User = Depends(get_current_user),
):
    try:
        steps = await _load_steps_for(automation_name)
        result = build_param_form(steps)
        return _to_plain(result)
    except HTTPException:
        raise
    except Exception:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error building parameter schema",
        )


@router.post("/preview/{automation_name}/create-workflow")
async def create_workflow(
    automation_name: str,
    body: CreateWorkflowRequest,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """
    Compiles the preview, and -- ONLY if the result is deployable -- pushes
    it to n8n and records the bridge row (Stage 2.3). A non-deployable
    compile (missing params / unresolved operations) returns exactly what
    it did before this stage: no n8n call, no Agent row, same
    needs_user_input shape the frontend already handles.
    """
    try:
        steps = await _load_steps_for(automation_name)

        overrides: Overrides = {
            step_num: StepOverride(operation=ov.operation, target=ov.target)
            for step_num, ov in body.overrides.items()
        }

        result = compile_workflow(
            steps,
            SuppliedParamProvider(body.params),
            PostgresCredentialResolver(db),
            user_id=str(current_user.id),
            workflow_name=body.workflow_name,
            overrides=overrides or None,
        )

        response: dict[str, Any] = {
            "is_deployable": result.report.is_deployable,
            "warnings": result.report.warnings,
            "needs_user_input": _to_plain(result.report.needs_user_input),
            "workflow_json": result.workflow_json,
            "agent": None,
        }

        if not result.report.is_deployable:
            return response

        try:
            n8n_workflow = await n8n_client.create_workflow(result.workflow_json)
        except n8n_client.N8nClientError as e:
            # The compiled JSON itself was rejected by n8n -- nothing was
            # created there, so there's no Agent row to write; surface the
            # real n8n validation error rather than a generic 502.
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"n8n rejected the workflow: {e}",
            )

        n8n_workflow_id = n8n_workflow["id"]

        # The workflow now genuinely exists in n8n regardless of what
        # happens next -- write the Agent row even if activation fails, so
        # we never lose track of a real n8n workflow id (same principle as
        # integration_service.connect_oauth_init keeping a pending row
        # rather than silently dropping a half-created credential).
        agent_status = "created"
        last_error = None
        try:
            await n8n_client.activate_workflow(n8n_workflow_id)
            agent_status = "active"
        except n8n_client.N8nClientError as e:
            last_error = str(e)
            response["warnings"].append(
                f"workflow created in n8n but activation failed: {e}"
            )

        agent_row = Agent(
            user_id=current_user.id,
            automation_name=automation_name,
            workflow_name=body.workflow_name,
            n8n_workflow_id=n8n_workflow_id,
            status=agent_status,
            last_error=last_error,
        )
        db.add(agent_row)
        db.commit()
        db.refresh(agent_row)

        response["agent"] = {
            "id": str(agent_row.id),
            "n8n_workflow_id": agent_row.n8n_workflow_id,
            "status": agent_row.status,
            "workflow_name": agent_row.workflow_name,
        }
        return response
    except HTTPException:
        raise
    except Exception:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error compiling workflow",
        )
