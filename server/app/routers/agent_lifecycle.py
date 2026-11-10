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

Stale agents: each row is stamped with the user's n8n_connection_id when created. A row whose
stamp is NULL or differs from the user's current id belongs to an n8n instance they have since
replaced, so its workflow id means nothing on the current one. Such rows are listed
(stale=true) and can be deleted (Postgres only), but are never sent to n8n: activate /
deactivate / runs return 409 agent_stale and the refresh sync skips them. See
app/core/n8n_stale.py.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.n8n_errors import (
    N8N_ERRORS,
    is_n8n_not_found,
    n8n_http_error,
    n8n_status,
)
from app.core.n8n_gate import N8N_NOT_CONFIGURED_DETAIL, optional_n8n, require_n8n
from app.core.n8n_stale import is_stale
from app.database import get_postgres_db
from app.models.agent import Agent
from app.models.user import User
from app.services.n8n_client import N8nClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agent-lifecycle"])

_LAST_ERROR_MAX = 1000
_N8N_ERRORS = N8N_ERRORS  # alias kept for existing imports

AGENT_STALE_DETAIL = {
    "code": "agent_stale",
    "message": (
        "This agent belongs to an n8n instance you have since replaced, so it can no longer "
        "be controlled from here. Delete it and create it again on your current instance."
    ),
}


# ---------------- helpers (also used by agent_router.create_workflow) ----------------


def agent_to_dict(
    agent: Agent, current_connection_id: Optional[uuid.UUID]
) -> dict[str, Any]:
    return {
        "id": str(agent.id),
        "automation_name": agent.automation_name,
        "workflow_name": agent.workflow_name,
        "n8n_workflow_id": agent.n8n_workflow_id,
        "status": agent.status,
        "last_error": agent.last_error,
        "stale": is_stale(agent.n8n_connection_id, current_connection_id),
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


def name_conflict_detail(
    existing: Optional[Agent], current_connection_id: Optional[uuid.UUID]
) -> dict[str, Any]:
    """
    Body for the 409 -- structured so the frontend can branch on `code`. `stale` is True when
    the clashing agent belongs to a previous n8n instance: the name is still taken (the unique
    constraint does not care), but the fix is deleting that agent, not picking another name.
    """
    stale = existing is not None and is_stale(
        existing.n8n_connection_id, current_connection_id
    )
    message = (
        "You already have an agent with this name from a previous n8n connection. "
        "Delete it from My Agents, then try again."
        if stale
        else "You already have an agent with this name. Choose a different name."
    )
    return {
        "code": "agent_name_taken",
        "message": message,
        "agent_id": str(existing.id) if existing is not None else None,
        "stale": stale,
    }


async def remove_n8n_workflow_best_effort(n8n: N8nClient, n8n_workflow_id: str) -> bool:
    """
    Compensation for a workflow created in n8n whose Agent row could not be
    saved. Never raises: the caller is already on an error path. Returns
    False (and logs) if n8n could not delete it, so the orphan is at least
    visible in the server log with its id.
    """
    try:
        await n8n.delete_workflow(n8n_workflow_id)
        return True
    except N8N_ERRORS as e:
        # Step + status only: the exception text can carry n8n's response body.
        logger.error(
            "ORPHANED n8n workflow %s (user %s): cleanup failed, status=%s",
            n8n_workflow_id,
            n8n.user_id,
            n8n_status(e),
        )
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


def ensure_not_stale(agent: Agent, n8n: N8nClient) -> None:
    """
    409 agent_stale if the agent's workflow lives on a different n8n instance than the one
    `n8n` talks to. Every call that would send agent.n8n_workflow_id to n8n goes through this:
    on the wrong instance the id is either unknown (a misleading 404) or, worse, someone
    else's workflow (older n8n versions use sequential ids).
    """
    if is_stale(agent.n8n_connection_id, n8n.connection_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=AGENT_STALE_DETAIL
        )


def _is_not_found(exc: Exception) -> bool:
    return is_n8n_not_found(exc)


def _mark_missing(agent: Agent) -> None:
    agent.status = "missing"
    agent.last_error = "Workflow no longer exists in n8n"


async def _sync_from_n8n(n8n: N8nClient, agent: Agent) -> None:
    """Mutates `agent` from n8n's live state; the caller commits. Errors other
    than 'not found' leave the row untouched (n8n briefly unreachable must not
    rewrite statuses)."""
    try:
        wf = await n8n.get_workflow(agent.n8n_workflow_id)
    except N8N_ERRORS as e:
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
    # Listing never needs n8n (a new user must still be able to open My Agents). A live
    # re-sync only happens when n8n is connected; otherwise the DB state is returned as-is.
    n8n = optional_n8n(current_user) if refresh and agents else None
    if n8n is not None:
        # Stale agents belong to a previous instance: never ask this n8n about them (a 404
        # would wrongly read as "missing", a colliding id as someone else's live workflow).
        live = [
            a for a in agents if not is_stale(a.n8n_connection_id, n8n.connection_id)
        ]
        if live:
            await asyncio.gather(
                *(_sync_from_n8n(n8n, a) for a in live), return_exceptions=True
            )
            db.commit()
    return {
        "agents": [agent_to_dict(a, current_user.n8n_connection_id) for a in agents]
    }


@router.post("/{agent_id}/deactivate")
async def deactivate_agent(
    agent_id: uuid.UUID,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
    n8n: N8nClient = Depends(require_n8n),
):
    """Stops the workflow but keeps it. POST /agents/{id}/activate turns it back on."""
    agent = _owned_agent(db, agent_id, current_user)
    ensure_not_stale(agent, n8n)
    try:
        await n8n.deactivate_workflow(agent.n8n_workflow_id)
    except N8N_ERRORS as e:
        if not _is_not_found(e):
            raise n8n_http_error(
                "deactivate_workflow", e, "n8n deactivation failed"
            ) from None
        _mark_missing(agent)
        db.commit()
        db.refresh(agent)
        return agent_to_dict(agent, n8n.connection_id)

    agent.status = "inactive"
    agent.last_error = None
    db.commit()
    db.refresh(agent)
    return agent_to_dict(agent, n8n.connection_id)


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

    Not behind require_n8n: a STALE agent (workflow on a previous n8n instance) is deleted
    from Postgres only, with no n8n call, so it stays removable even when n8n is not
    connected. A fresh agent still needs a usable client (409 n8n_not_configured).
    """
    agent = _owned_agent(db, agent_id, current_user)

    if is_stale(agent.n8n_connection_id, current_user.n8n_connection_id):
        db.delete(agent)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    n8n = optional_n8n(current_user)
    if n8n is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=N8N_NOT_CONFIGURED_DETAIL
        )

    if agent.status == "active":
        try:
            await n8n.deactivate_workflow(agent.n8n_workflow_id)
        except N8N_ERRORS as e:
            if not _is_not_found(e):
                raise n8n_http_error(
                    "deactivate_workflow",
                    e,
                    "n8n deactivation failed, agent not deleted",
                ) from None
    try:
        await n8n.delete_workflow(agent.n8n_workflow_id)
    except N8N_ERRORS as e:
        if not _is_not_found(e):
            raise n8n_http_error(
                "delete_workflow", e, "n8n deletion failed, agent not deleted"
            ) from None

    db.delete(agent)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{agent_id}/runs")
async def agent_runs(
    agent_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
    n8n: N8nClient = Depends(require_n8n),
):
    """Recent n8n executions, newest first. Not copied into Postgres."""
    agent = _owned_agent(db, agent_id, current_user)
    ensure_not_stale(agent, n8n)
    try:
        raw = await n8n.list_executions(agent.n8n_workflow_id, limit)
    except N8N_ERRORS as e:
        raise n8n_http_error(
            "list_executions", e, "n8n executions lookup failed"
        ) from None
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
