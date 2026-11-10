"""
tests/test_agent_lifecycle.py

Offline tests for the lifecycle endpoints (list / deactivate / delete / runs), the
duplicate-name helpers, and the stale-instance behavior (plan task 1.6). Real FastAPI
routing + real Agent model on an in-memory SQLite DB; the per-user N8nClient is faked, so
no n8n, Postgres or Fernet key is needed.

How n8n is faked: require_n8n is overridden as a FastAPI dependency, and lifecycle's
optional_n8n (called directly, not a dependency) is monkeypatched. `env.n8n_usable = False`
simulates a user with no usable n8n (not connected, or secrets undecryptable).
"""

import asyncio
import types
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.auth import get_current_user
from app.core.n8n_gate import require_n8n
from app.database import Base, get_postgres_db
from app.models.agent import Agent
from app.models.user import User
from app.routers import agent_lifecycle as lc
from app.services import n8n_client

CONN_A = uuid.UUID(
    "aaaaaaaa-0000-4000-8000-000000000001"
)  # alice's CURRENT n8n connection
CONN_OLD = uuid.UUID("bbbbbbbb-0000-4000-8000-000000000002")  # a previous instance


class FakeN8n:
    """Records calls; `fail` maps a function name to the error it should raise."""

    def __init__(self, current):
        self._current = current
        self.user_id = uuid.uuid4()
        self.calls = []
        self.fail = {}
        self.workflows = {}  # id -> {"active": bool}
        self.executions = []

    @property
    def connection_id(self):
        return self._current["conn"]

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
    alice = User(email="alice@x.co", provider="local", n8n_connection_id=CONN_A)
    bob = User(email="bob@x.co", provider="local", n8n_connection_id=CONN_A)
    seed.add_all([alice, bob])
    seed.commit()
    ids = {"alice": alice.id, "bob": bob.id}
    seed.close()

    # `conn` is alice's current n8n connection id (None = no n8n connected).
    current = {"id": ids["alice"], "conn": CONN_A}
    state = {"n8n_usable": True}
    app = FastAPI()
    app.include_router(lc.router)

    def _db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    fake = FakeN8n(current)
    app.dependency_overrides[get_postgres_db] = _db
    app.dependency_overrides[get_current_user] = lambda: types.SimpleNamespace(
        id=current["id"], n8n_connection_id=current["conn"]
    )
    app.dependency_overrides[require_n8n] = lambda: fake
    monkeypatch.setattr(
        lc, "optional_n8n", lambda user: fake if state["n8n_usable"] else None
    )

    def add_agent(owner, name, wf, status="active", stamp="fresh"):
        """stamp: "fresh" = alice's current connection; None = unstamped; or a UUID."""
        db = Session()
        a = Agent(
            user_id=ids[owner],
            automation_name="auto",
            workflow_name=name,
            n8n_workflow_id=wf,
            n8n_connection_id=CONN_A if stamp == "fresh" else stamp,
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
        state=state,
        add_agent=add_agent,
        row=row,
        Session=Session,
    )


# ---------------------------------------------------------------- baseline behavior


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
    env.add_agent("alice", "A2", "wf2", status="inactive")
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
        detail = lc.name_conflict_detail(hit, CONN_A)
        assert detail["code"] == "agent_name_taken" and detail["agent_id"] == str(a)
        assert detail["stale"] is False

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
    env.fake.fail["delete"] = _err(500)
    assert asyncio.run(lc.remove_n8n_workflow_best_effort(env.fake, "wf-x")) is False
    env.fake.fail.clear()
    assert asyncio.run(lc.remove_n8n_workflow_best_effort(env.fake, "wf-x")) is True


# ---------------------------------------------------------------- stale instance (1.6)


def test_list_marks_stale_and_unstamped_agents(env):
    env.add_agent("alice", "Fresh", "wf1")
    env.add_agent("alice", "OtherInstance", "wf2", stamp=CONN_OLD)
    env.add_agent("alice", "Unstamped", "wf3", stamp=None)
    r = env.client.get("/agents")
    stale = {a["workflow_name"]: a["stale"] for a in r.json()["agents"]}
    assert stale == {"Fresh": False, "OtherInstance": True, "Unstamped": True}
    assert env.fake.calls == []


def test_user_with_no_n8n_sees_every_agent_stale(env):
    env.current["conn"] = None
    env.state["n8n_usable"] = False
    env.add_agent("alice", "A1", "wf1")  # stamped with the connection she no longer has
    r = env.client.get("/agents?refresh=true")
    assert [a["stale"] for a in r.json()["agents"]] == [True]
    assert env.fake.calls == []


def test_list_refresh_never_asks_n8n_about_stale_agents(env):
    env.fake.workflows = {"wf1": {"active": False}}
    fresh = env.add_agent("alice", "Fresh", "wf1", status="active")
    stale = env.add_agent("alice", "Old", "wf-old", status="active", stamp=CONN_OLD)
    r = env.client.get("/agents?refresh=true")
    assert r.status_code == 200
    assert env.fake.calls == [("get", "wf1")]  # only the fresh one
    assert env.row(fresh).status == "inactive"
    assert env.row(stale).status == "active"  # NOT turned into "missing"


def test_stale_agent_is_409_on_deactivate_and_runs_without_touching_n8n(env):
    a = env.add_agent("alice", "Old", "wf-old", stamp=CONN_OLD)
    for resp in (
        env.client.post(f"/agents/{a}/deactivate"),
        env.client.get(f"/agents/{a}/runs"),
    ):
        assert resp.status_code == 409
        assert resp.json()["detail"]["code"] == "agent_stale"
    assert env.fake.calls == []
    assert env.row(a).status == "active"


def test_unstamped_agent_is_treated_as_stale(env):
    a = env.add_agent("alice", "Legacy", "wf-legacy", stamp=None)
    resp = env.client.post(f"/agents/{a}/deactivate")
    assert resp.status_code == 409 and resp.json()["detail"]["code"] == "agent_stale"
    assert env.fake.calls == []


@pytest.mark.parametrize("usable", [True, False])
def test_delete_stale_agent_is_postgres_only(env, usable):
    env.state["n8n_usable"] = usable
    a = env.add_agent("alice", "Old", "wf-old", status="active", stamp=CONN_OLD)
    assert env.client.delete(f"/agents/{a}").status_code == 204
    assert env.row(a) is None
    assert env.fake.calls == []  # not even a deactivate


def test_delete_unstamped_agent_is_postgres_only(env):
    a = env.add_agent("alice", "Legacy", "wf-legacy", stamp=None)
    assert env.client.delete(f"/agents/{a}").status_code == 204
    assert env.row(a) is None
    assert env.fake.calls == []


def test_delete_fresh_agent_without_usable_n8n_is_409_and_keeps_row(env):
    env.state["n8n_usable"] = False  # e.g. stored secrets can no longer be decrypted
    a = env.add_agent("alice", "A1", "wf1")
    r = env.client.delete(f"/agents/{a}")
    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "n8n_not_configured"
    assert env.row(a) is not None
    assert env.fake.calls == []


def test_ensure_not_stale_helper(env):
    fresh = Agent(n8n_connection_id=CONN_A)
    old = Agent(n8n_connection_id=CONN_OLD)
    none = Agent(n8n_connection_id=None)
    lc.ensure_not_stale(fresh, env.fake)  # no raise
    for agent in (old, none):
        with pytest.raises(Exception) as exc:
            lc.ensure_not_stale(agent, env.fake)
        assert exc.value.status_code == 409
        assert exc.value.detail["code"] == "agent_stale"


def test_name_conflict_detail_flags_a_stale_clash(env):
    old = Agent(id=uuid.uuid4(), n8n_connection_id=CONN_OLD)
    detail = lc.name_conflict_detail(old, CONN_A)
    assert detail["code"] == "agent_name_taken"
    assert detail["stale"] is True
    assert "Delete it" in detail["message"]
    assert lc.name_conflict_detail(None, CONN_A)["stale"] is False
