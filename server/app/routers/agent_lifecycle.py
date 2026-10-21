"""
Agent lifecycle endpoints: list / deactivate / delete / run history, plus the
helpers create-workflow uses for its duplicate-name guard.

Kept in its own module (not agent_router.py) so it stays small and can be
tested without importing the generation/FAISS/Groq stack. It shares the
/agents prefix; routes here never overlap agent_router's.

Ownership: every {agent_id} route filters on user_id as well, so another
user's agent is indistinguishable from a nonexistent one (404, not 403) --
same convention as agent_router.activate_agent.

DB vs n8n: Postgres only bridges a user to an n8n workflow (see Agent), so
n8n stays the source of truth for whether a workflow is active. The list
endpoint reads the DB by default (fast) and re-syncs from n8n with
?refresh=true.
"""

from __future__ import annotations

import asyncio
import traceback
import uuid
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.database import get_postgres_db
from app.models.agent import Agent
from app.models.user import User
from app.services import n8n_client

router = APIRouter(prefix="/agents", tags=["agent-lifecycle"])

_LAST_ERROR_MAX = 1000
_N8N_ERRORS = (n8n_client.N8nClientError, httpx.HTTPError)


# ---------------- helpers (also used by agent_router.create_workflow) ----------------


def agent_to_dict(agent: Agent) -> dict[str, Any]:
    return {
        "id": str(agent.id),
        "automation_name": agent.automation_name,
        "workflow_name": agent.workflow_name,
        "n8n_workflow_id": agent.n8n_workflow_id,
        "status": agent.status,
        "last_error": agent.last_error,
        "created_at": agent.created_at.isoformat() if agent.created_at else None,
        "updated_at": agent.updated_at.isoformat() if agent.updated_at else None,
    }


def find_name_conflict(
    db: Session, user_id: uuid.UUID, workflow_name: str
) -> Optional[Agent]:
    """The user's existing agent with this exact name, if any."""
    return (
        db.query(Agent)
        .filter(Agent.user_id == user_id, Agent.workflow_name == workflow_name)
        .first()
    )


def name_conflict_detail(existing: Optional[Agent]) -> dict[str, Any]:
    """Body for the 409 -- structured so the frontend can branch on `code`."""
    return {
        "code": "agent_name_taken",
        "message": "You already have an agent with this name. Choose a different name.",
        "agent_id": str(existing.id) if existing is not None else None,
    }


async def remove_n8n_workflow_best_effort(n8n_workflow_id: str) -> bool:
    """
    Compensation for a workflow created in n8n whose Agent row could not be
    saved. Never raises: the caller is already on an error path. Returns
    False (and logs) if n8n could not delete it, so the orphan is at least
    visible in the server log with its id.
    """
    try:
        await n8n_client.delete_workflow(n8n_workflow_id)
        return True
    except _N8N_ERRORS:
        print(
            f"[agent-lifecycle] ORPHANED n8n workflow {n8n_workflow_id}: cleanup failed"
        )
        traceback.print_exc()
        return False


def _owned_agent(db: Session, agent_id: uuid.UUID, user: User) -> Agent:
    agent = (
        db.query(Agent).filter(Agent.id == agent_id, Agent.user_id == user.id).first()
    )
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found"
        )
    return agent


def _is_not_found(exc: Exception) -> bool:
    return isinstance(exc, n8n_client.N8nClientError) and exc.status_code == 404


def _mark_missing(agent: Agent) -> None:
    agent.status = "missing"
    agent.last_error = "Workflow no longer exists in n8n"


async def _sync_from_n8n(agent: Agent) -> None:
    """Mutates `agent` from n8n's live state; the caller commits. Errors other
    than 'not found' leave the row untouched (n8n briefly unreachable must not
    rewrite statuses)."""
    try:
        wf = await n8n_client.get_workflow(agent.n8n_workflow_id)
    except _N8N_ERRORS as e:
        if _is_not_found(e):
            _mark_missing(agent)
        return
    if wf.get("active"):
        agent.status = "active"
    elif agent.status in ("active", "missing"):
        agent.status = "inactive"


# ---------------- endpoints ----------------


@router.get("")
async def list_agents(
    refresh: bool = Query(False, description="re-sync each status from n8n first"),
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    agents = (
        db.query(Agent)
        .filter(Agent.user_id == current_user.id)
        .order_by(Agent.created_at.desc())
        .all()
    )
    if refresh and agents:
        await asyncio.gather(
            *(_sync_from_n8n(a) for a in agents), return_exceptions=True
        )
        db.commit()
    return {"agents": [agent_to_dict(a) for a in agents]}


@router.post("/{agent_id}/deactivate")
async def deactivate_agent(
    agent_id: uuid.UUID,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """Stops the workflow but keeps it. POST /agents/{id}/activate turns it back on."""
    agent = _owned_agent(db, agent_id, current_user)
    try:
        await n8n_client.deactivate_workflow(agent.n8n_workflow_id)
    except _N8N_ERRORS as e:
        if not _is_not_found(e):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"n8n deactivation failed: {e}",
            )
        _mark_missing(agent)
        db.commit()
        db.refresh(agent)
        return agent_to_dict(agent)

    agent.status = "inactive"
    agent.last_error = None
    db.commit()
    db.refresh(agent)
    return agent_to_dict(agent)


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: uuid.UUID,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deletes the n8n workflow FIRST, then the row. If n8n fails for any reason
    other than 'already gone', the row is kept and the call returns 502, so a
    live workflow is never left running with no record of it.
    """
    agent = _owned_agent(db, agent_id, current_user)

    if agent.status == "active":
        try:
            await n8n_client.deactivate_workflow(agent.n8n_workflow_id)
        except _N8N_ERRORS as e:
            if not _is_not_found(e):
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"n8n deactivation failed, agent not deleted: {e}",
                )
    try:
        await n8n_client.delete_workflow(agent.n8n_workflow_id)
    except _N8N_ERRORS as e:
        if not _is_not_found(e):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"n8n deletion failed, agent not deleted: {e}",
            )

    db.delete(agent)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{agent_id}/runs")
async def agent_runs(
    agent_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """Recent n8n executions, newest first. Not copied into Postgres."""
    agent = _owned_agent(db, agent_id, current_user)
    try:
        raw = await n8n_client.list_executions(agent.n8n_workflow_id, limit)
    except _N8N_ERRORS as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"n8n executions lookup failed: {e}",
        )
    runs = [
        {
            "id": str(ex.get("id")),
            "status": ex.get("status")
            or ("success" if ex.get("finished") else "error"),
            "mode": ex.get("mode"),
            "started_at": ex.get("startedAt"),
            "stopped_at": ex.get("stoppedAt"),
        }
        for ex in (raw.get("data") or [])
    ]
    return {"agent_id": str(agent.id), "runs": runs}
