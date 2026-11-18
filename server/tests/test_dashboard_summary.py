"""
tests/test_dashboard_summary.py

Offline tests for GET /dashboard/summary: in-memory SQLite + real models, n8n faked by
monkeypatching dashboard_router.optional_n8n (None = n8n not connected).
"""

import types
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.auth import get_current_user
from app.database import Base, get_postgres_db
from app.models.agent import Agent
from app.models.integration import Integration
from app.models.user import User
from app.routers import dashboard_router as dr
from app.services import n8n_client

CONN_A = uuid.UUID("aaaaaaaa-0000-4000-8000-000000000001")
CONN_OLD = uuid.UUID("bbbbbbbb-0000-4000-8000-000000000002")


def _iso(dt):
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class FakeN8n:
    def __init__(self):
        self.executions = {}  # wf_id -> list
        self.fail = set()
        self.calls = []

    async def list_executions(self, wf_id, limit=20):
        self.calls.append(wf_id)
        if wf_id in self.fail:
            raise n8n_client.N8nClientError("boom", status_code=500)
        return {"data": self.executions.get(wf_id, [])}


@pytest.fixture
def env(monkeypatch):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(
        engine, tables=[User.__table__, Agent.__table__, Integration.__table__]
    )
    Session = sessionmaker(bind=engine)

    seed = Session()
    alice = User(email="alice@x.co", provider="local", n8n_connection_id=CONN_A)
    bob = User(email="bob@x.co", provider="local", n8n_connection_id=CONN_A)
    seed.add_all([alice, bob])
    seed.commit()
    ids = {"alice": alice.id, "bob": bob.id}
    seed.close()

    current = {"conn": CONN_A}
    fake = FakeN8n()
    state = {"n8n": fake}

    app = FastAPI()
    app.include_router(dr.router)

    def _db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_postgres_db] = _db
    app.dependency_overrides[get_current_user] = lambda: types.SimpleNamespace(
        id=ids["alice"], n8n_connection_id=current["conn"]
    )
    monkeypatch.setattr(dr, "optional_n8n", lambda user: state["n8n"])

    def add_agent(owner, wf, status="active", stamp=CONN_A, created_at=None):
        db = Session()
        a = Agent(
            user_id=ids[owner],
            automation_name="auto",
            workflow_name=wf,
            n8n_workflow_id=wf,
            n8n_connection_id=stamp,
            status=status,
        )
        if created_at is not None:
            a.created_at = created_at
        db.add(a)
        db.commit()
        db.close()

    def add_integration(owner, service, pending=False, active=True, stamp=CONN_A):
        db = Session()
        db.add(
            Integration(
                user_id=ids[owner],
                service=service,
                n8n_credential_id="c-" + service,
                n8n_credential_type="t",
                n8n_connection_id=stamp,
                auth_option_id="api_key",
                connection_pattern="text_fields",
                oauth_pending=pending,
                is_active=active,
            )
        )
        db.commit()
        db.close()

    return types.SimpleNamespace(
        client=TestClient(app),
        fake=fake,
        state=state,
        current=current,
        add_agent=add_agent,
        add_integration=add_integration,
    )


def test_empty_user(env):
    r = env.client.get("/dashboard/summary")
    assert r.status_code == 200
    body = r.json()
    assert body["agents"]["total"] == 0
    assert body["agents"]["needs_attention"] == 0
    assert body["integrations"] == {"connected": 0, "pending": 0}
    assert body["runs"]["available"] is True
    assert body["runs"]["success_rate"] is None
    assert env.fake.calls == []


def test_agent_counts_and_status_buckets(env):
    env.add_agent("alice", "a1", "active")
    env.add_agent("alice", "a2", "inactive")
    env.add_agent("alice", "a3", "failed")
    env.add_agent("alice", "a4", "missing")
    env.add_agent("alice", "a5", "active", stamp=CONN_OLD)  # stale
    env.add_agent("alice", "a6", "active", stamp=None)  # unstamped -> stale
    env.add_agent("bob", "b1", "active")

    agents = env.client.get("/dashboard/summary").json()["agents"]
    assert agents["total"] == 6
    assert agents["active"] == 1
    assert agents["needs_attention"] == 4
    assert agents["by_status"] == {
        "active": 1,
        "inactive": 1,
        "created": 0,
        "failed": 1,
        "missing": 1,
        "stale": 2,
    }
    # Stale agents are never sent to n8n; bob's are never seen.
    assert sorted(env.fake.calls) == ["a1", "a2", "a3", "a4"]


def test_created_this_month(env):
    now = datetime.now(timezone.utc)
    env.add_agent("alice", "new", created_at=now)
    env.add_agent("alice", "old", created_at=now - timedelta(days=40))
    agents = env.client.get("/dashboard/summary").json()["agents"]
    assert agents["created_this_month"] == 1


def test_integration_counts(env):
    env.add_integration("alice", "gmail")
    env.add_integration("alice", "slack", pending=True)
    env.add_integration("alice", "notion", active=False)
    env.add_integration("alice", "stripe", stamp=CONN_OLD)
    env.add_integration("bob", "github")
    body = env.client.get("/dashboard/summary").json()
    assert body["integrations"] == {"connected": 1, "pending": 1}


def test_run_stats_window_and_success_rate(env):
    now = datetime.now(timezone.utc)
    env.add_agent("alice", "a1")
    env.add_agent("alice", "a2")
    env.fake.executions["a1"] = [
        {"status": "success", "startedAt": _iso(now - timedelta(hours=1))},
        {"status": "success", "startedAt": _iso(now - timedelta(days=2))},
        {"status": "error", "startedAt": _iso(now - timedelta(days=3))},
        {"status": "success", "startedAt": _iso(now - timedelta(days=30))},  # outside
    ]
    env.fake.executions["a2"] = [
        {"status": "running", "startedAt": _iso(now)},
        {"finished": True, "startedAt": _iso(now - timedelta(days=1))},  # legacy
    ]
    runs = env.client.get("/dashboard/summary").json()["runs"]
    assert runs["available"] is True
    assert runs["total"] == 5
    assert runs["succeeded"] == 3
    assert runs["failed"] == 1
    assert runs["success_rate"] == 75.0
    assert runs["partial"] is False


def test_n8n_not_connected_still_returns_postgres_numbers(env):
    env.state["n8n"] = None
    env.add_agent("alice", "a1")
    body = env.client.get("/dashboard/summary").json()
    assert body["n8n_connected"] is False
    assert body["agents"]["total"] == 1
    assert body["runs"]["available"] is False


def test_n8n_partial_failure(env):
    now = datetime.now(timezone.utc)
    env.add_agent("alice", "a1")
    env.add_agent("alice", "a2")
    env.fake.fail.add("a2")
    env.fake.executions["a1"] = [{"status": "success", "startedAt": _iso(now)}]
    runs = env.client.get("/dashboard/summary").json()["runs"]
    assert runs["available"] is True
    assert runs["partial"] is True
    assert runs["total"] == 1


def test_n8n_total_failure_marks_unavailable(env):
    env.add_agent("alice", "a1")
    env.fake.fail.add("a1")
    r = env.client.get("/dashboard/summary")
    assert r.status_code == 200
    assert r.json()["runs"]["available"] is False
