"""
tests/test_agent_lifecycle.py

Offline tests for the lifecycle endpoints (list / deactivate / delete / runs)
and the duplicate-name helpers. Real FastAPI routing + real Agent model on an
in-memory SQLite DB; n8n_client is faked, so no n8n or Postgres is needed.
"""

import types
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.auth import get_current_user
from app.database import Base, get_postgres_db
from app.models.agent import Agent
from app.models.user import User
from app.routers import agent_lifecycle as lc
from app.services import n8n_client


class FakeN8n:
    """Records calls; `fail` maps a function name to the error it should raise."""

    def __init__(self):
        self.calls = []
        self.fail = {}
        self.workflows = {}  # id -> {"active": bool}
        self.executions = []

    def _maybe_fail(self, name):
        if name in self.fail:
            raise self.fail[name]

    async def deactivate_workflow(self, wf_id):
        self.calls.append(("deactivate", wf_id))
        self._maybe_fail("deactivate")
        return {}

    async def delete_workflow(self, wf_id):
        self.calls.append(("delete", wf_id))
        self._maybe_fail("delete")

    async def get_workflow(self, wf_id):
        self.calls.append(("get", wf_id))
        self._maybe_fail("get")
        if wf_id not in self.workflows:
            raise n8n_client.N8nClientError("lookup failed", status_code=404)
        return self.workflows[wf_id]

    async def list_executions(self, wf_id, limit=20):
        self.calls.append(("executions", wf_id, limit))
        self._maybe_fail("executions")
        return {"data": self.executions}


def _err(status):
    return n8n_client.N8nClientError("boom", status_code=status)


@pytest.fixture
def env(monkeypatch):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine, tables=[User.__table__, Agent.__table__])
    Session = sessionmaker(bind=engine)

    seed = Session()
    alice = User(email="alice@x.co", provider="local")
    bob = User(email="bob@x.co", provider="local")
    seed.add_all([alice, bob])
    seed.commit()
    ids = {"alice": alice.id, "bob": bob.id}
    seed.close()

    current = {"id": ids["alice"]}
    app = FastAPI()
    app.include_router(lc.router)

    def _db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_postgres_db] = _db
    app.dependency_overrides[get_current_user] = lambda: types.SimpleNamespace(
        id=current["id"]
    )

    fake = FakeN8n()
    for name in (
        "deactivate_workflow",
        "delete_workflow",
        "get_workflow",
        "list_executions",
    ):
        monkeypatch.setattr(n8n_client, name, getattr(fake, name))

    def add_agent(owner, name, wf, status="active"):
        db = Session()
        a = Agent(
            user_id=ids[owner],
            automation_name="auto",
            workflow_name=name,
            n8n_workflow_id=wf,
            status=status,
        )
        db.add(a)
        db.commit()
        agent_id = a.id
        db.close()
        return agent_id

    def row(agent_id):
        db = Session()
        try:
            return db.query(Agent).filter(Agent.id == agent_id).first()
        finally:
            db.close()

    return types.SimpleNamespace(
        client=TestClient(app),
        fake=fake,
        ids=ids,
        current=current,
        add_agent=add_agent,
        row=row,
        Session=Session,
    )


def test_list_returns_only_own_agents(env):
    env.add_agent("alice", "A1", "wf1")
    env.add_agent("bob", "B1", "wf2")
    r = env.client.get("/agents")
    assert r.status_code == 200
    assert [a["workflow_name"] for a in r.json()["agents"]] == ["A1"]


def test_other_users_agent_is_404_everywhere(env):
    bobs = env.add_agent("bob", "B1", "wf2")
    assert env.client.post(f"/agents/{bobs}/deactivate").status_code == 404
    assert env.client.delete(f"/agents/{bobs}").status_code == 404
    assert env.client.get(f"/agents/{bobs}/runs").status_code == 404
    assert env.fake.calls == []  # n8n never touched
    assert env.row(bobs) is not None


def test_deactivate_sets_inactive(env):
    a = env.add_agent("alice", "A1", "wf1")
    r = env.client.post(f"/agents/{a}/deactivate")
    assert r.status_code == 200 and r.json()["status"] == "inactive"
    assert ("deactivate", "wf1") in env.fake.calls
    assert env.row(a).status == "inactive"


def test_deactivate_when_workflow_gone_marks_missing(env):
    env.fake.fail["deactivate"] = _err(404)
    a = env.add_agent("alice", "A1", "wf1")
    r = env.client.post(f"/agents/{a}/deactivate")
    assert r.status_code == 200 and r.json()["status"] == "missing"


def test_deactivate_n8n_error_returns_502_and_keeps_status(env):
    env.fake.fail["deactivate"] = _err(500)
    a = env.add_agent("alice", "A1", "wf1")
    assert env.client.post(f"/agents/{a}/deactivate").status_code == 502
    assert env.row(a).status == "active"


def test_delete_active_deactivates_then_deletes_then_drops_row(env):
    a = env.add_agent("alice", "A1", "wf1", status="active")
    r = env.client.delete(f"/agents/{a}")
    assert r.status_code == 204
    assert env.fake.calls == [("deactivate", "wf1"), ("delete", "wf1")]
    assert env.row(a) is None


def test_delete_inactive_skips_deactivate(env):
    a = env.add_agent("alice", "A1", "wf1", status="inactive")
    assert env.client.delete(f"/agents/{a}").status_code == 204
    assert env.fake.calls == [("delete", "wf1")]


def test_delete_when_already_gone_in_n8n_still_removes_row(env):
    env.fake.fail["delete"] = _err(404)
    a = env.add_agent("alice", "A1", "wf1", status="inactive")
    assert env.client.delete(f"/agents/{a}").status_code == 204
    assert env.row(a) is None


def test_delete_n8n_error_keeps_row(env):
    env.fake.fail["delete"] = _err(500)
    a = env.add_agent("alice", "A1", "wf1", status="inactive")
    assert env.client.delete(f"/agents/{a}").status_code == 502
    assert env.row(a) is not None


def test_delete_deactivation_error_keeps_row_and_skips_delete(env):
    env.fake.fail["deactivate"] = _err(500)
    a = env.add_agent("alice", "A1", "wf1", status="active")
    assert env.client.delete(f"/agents/{a}").status_code == 502
    assert ("delete", "wf1") not in env.fake.calls
    assert env.row(a) is not None


def test_runs_are_mapped_and_limit_passed(env):
    env.fake.executions = [
        {
            "id": 7,
            "status": "success",
            "mode": "trigger",
            "startedAt": "2026-10-21T10:00:00Z",
            "stoppedAt": "2026-10-21T10:00:02Z",
        },
        {
            "id": 6,
            "finished": False,
            "mode": "trigger",
            "startedAt": "t",
            "stoppedAt": None,
        },
    ]
    a = env.add_agent("alice", "A1", "wf1")
    r = env.client.get(f"/agents/{a}/runs?limit=5")
    assert r.status_code == 200
    runs = r.json()["runs"]
    assert [x["id"] for x in runs] == ["7", "6"]
    assert runs[0]["status"] == "success" and runs[1]["status"] == "error"
    assert ("executions", "wf1", 5) in env.fake.calls


def test_runs_limit_is_validated(env):
    a = env.add_agent("alice", "A1", "wf1")
    assert env.client.get(f"/agents/{a}/runs?limit=0").status_code == 422
    assert env.client.get(f"/agents/{a}/runs?limit=101").status_code == 422


def test_list_refresh_syncs_status_from_n8n(env):
    env.fake.workflows = {"wf1": {"active": False}, "wf2": {"active": True}}
    stale_active = env.add_agent("alice", "A1", "wf1", status="active")
    stale_inactive = env.add_agent("alice", "A2", "wf2", status="inactive")
    gone = env.add_agent("alice", "A3", "wf3", status="active")
    r = env.client.get("/agents?refresh=true")
    by_name = {a["workflow_name"]: a["status"] for a in r.json()["agents"]}
    assert by_name == {"A1": "inactive", "A2": "active", "A3": "missing"}
    assert env.row(stale_active).status == "inactive"
    assert env.row(gone).status == "missing"


def test_list_refresh_leaves_rows_alone_when_n8n_errors(env):
    env.fake.fail["get"] = _err(500)
    a = env.add_agent("alice", "A1", "wf1", status="active")
    r = env.client.get("/agents?refresh=true")
    assert r.json()["agents"][0]["status"] == "active"
    assert env.row(a).status == "active"


def test_list_without_refresh_never_calls_n8n(env):
    env.add_agent("alice", "A1", "wf1")
    env.client.get("/agents")
    assert env.fake.calls == []


def test_name_conflict_helpers_and_db_constraint(env):
    from sqlalchemy.exc import IntegrityError

    a = env.add_agent("alice", "Same Name", "wf1")
    db = env.Session()
    try:
        hit = lc.find_name_conflict(db, env.ids["alice"], "Same Name")
        assert hit is not None and hit.id == a
        assert lc.find_name_conflict(db, env.ids["bob"], "Same Name") is None
        assert lc.find_name_conflict(db, env.ids["alice"], "Other") is None
        detail = lc.name_conflict_detail(hit)
        assert detail["code"] == "agent_name_taken" and detail["agent_id"] == str(a)

        # the backstop the create endpoint relies on: same user + name is refused
        db.add(
            Agent(
                user_id=env.ids["alice"],
                automation_name="x",
                workflow_name="Same Name",
                n8n_workflow_id="wf-dup",
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
        # ...but a different user may reuse the name
        db.add(
            Agent(
                user_id=env.ids["bob"],
                automation_name="x",
                workflow_name="Same Name",
                n8n_workflow_id="wf-bob",
            )
        )
        db.commit()
    finally:
        db.close()


def test_best_effort_cleanup_never_raises(env):
    import asyncio

    env.fake.fail["delete"] = _err(500)
    assert asyncio.run(lc.remove_n8n_workflow_best_effort("wf-x")) is False
    env.fake.fail.clear()
    assert asyncio.run(lc.remove_n8n_workflow_best_effort("wf-x")) is True
