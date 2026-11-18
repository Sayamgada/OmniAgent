"""
GET /dashboard/summary -- the real numbers behind the dashboard home page.

Postgres counts (agents, integrations) are always returned. Run stats come from the
user's n8n executions and are best-effort: when n8n is not connected, or a lookup fails,
`runs.available` / `runs.partial` say so and the Postgres numbers are still returned.
Executions are never copied into Postgres.

Stale rows (stamped for a previous n8n instance, see app/core/n8n_stale.py) are never sent
to n8n, never count as active or connected, and are reported as needing attention.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.n8n_errors import N8N_ERRORS
from app.core.n8n_gate import optional_n8n
from app.core.n8n_stale import is_stale
from app.database import get_postgres_db
from app.models.agent import Agent
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

RUN_WINDOW_DAYS = 7
# Per agent. n8n returns newest first, so this only truncates very busy agents; the
# response's `runs.truncated` flags when that happened.
EXECUTIONS_PER_AGENT = 250

STATUS_BUCKETS = ("active", "inactive", "created", "failed", "missing", "stale")
_SUCCESS = {"success"}
_FAILED = {"error", "crashed", "failed"}


def _parse_ts(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _execution_status(ex: dict) -> str:
    # Same fallback as agent_lifecycle.agent_runs for older n8n versions.
    return ex.get("status") or ("success" if ex.get("finished") else "error")


async def _run_stats(n8n, workflow_ids: list[str], since: datetime) -> dict[str, Any]:
    stats: dict[str, Any] = {
        "available": True,
        "window_days": RUN_WINDOW_DAYS,
        "total": 0,
        "succeeded": 0,
        "failed": 0,
        "success_rate": None,
        "partial": False,
        "truncated": False,
    }
    if not workflow_ids:
        return stats

    results = await asyncio.gather(
        *(n8n.list_executions(wf_id, EXECUTIONS_PER_AGENT) for wf_id in workflow_ids),
        return_exceptions=True,
    )
    for res in results:
        if isinstance(res, BaseException):
            if not isinstance(res, N8N_ERRORS):
                logger.error("dashboard executions lookup crashed: %r", res)
            stats["partial"] = True
            continue
        data = res.get("data") or []
        if len(data) >= EXECUTIONS_PER_AGENT:
            stats["truncated"] = True
        for ex in data:
            started = _parse_ts(ex.get("startedAt"))
            if started is None or started < since:
                continue
            stats["total"] += 1
            st = _execution_status(ex)
            if st in _SUCCESS:
                stats["succeeded"] += 1
            elif st in _FAILED:
                stats["failed"] += 1

    if len(results) and all(isinstance(r, BaseException) for r in results):
        stats["available"] = False

    finished = stats["succeeded"] + stats["failed"]
    if finished:
        stats["success_rate"] = round(stats["succeeded"] * 100 / finished, 1)
    return stats


@router.get("/summary")
async def dashboard_summary(
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current_conn = current_user.n8n_connection_id

    agents = db.query(Agent).filter(Agent.user_id == current_user.id).all()

    by_status = {k: 0 for k in STATUS_BUCKETS}
    fresh_ids: list[str] = []
    created_this_month = 0
    for a in agents:
        created = _aware(a.created_at)
        if created is not None and created >= month_start:
            created_this_month += 1
        if is_stale(a.n8n_connection_id, current_conn):
            by_status["stale"] += 1
            continue
        fresh_ids.append(a.n8n_workflow_id)
        bucket = a.status if a.status in by_status else "created"
        by_status[bucket] += 1

    integrations = (
        db.query(Integration).filter(Integration.user_id == current_user.id).all()
    )
    connected = pending = 0
    for row in integrations:
        if not row.is_active or is_stale(row.n8n_connection_id, current_conn):
            continue
        if row.oauth_pending:
            pending += 1
        else:
            connected += 1

    n8n = optional_n8n(current_user)
    if n8n is None:
        runs: dict[str, Any] = {
            "available": False,
            "window_days": RUN_WINDOW_DAYS,
            "total": 0,
            "succeeded": 0,
            "failed": 0,
            "success_rate": None,
            "partial": False,
            "truncated": False,
        }
    else:
        runs = await _run_stats(
            n8n, fresh_ids, now - timedelta(days=RUN_WINDOW_DAYS)
        )

    return {
        "n8n_connected": n8n is not None,
        "agents": {
            "total": len(agents),
            "active": by_status["active"],
            "created_this_month": created_this_month,
            "needs_attention": by_status["failed"]
            + by_status["missing"]
            + by_status["stale"],
            "by_status": by_status,
        },
        "integrations": {"connected": connected, "pending": pending},
        "runs": runs,
    }
