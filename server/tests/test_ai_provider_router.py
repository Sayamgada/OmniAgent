"""
tests/test_ai_provider_router.py

GET /ai-providers: catalog + per-user connected status, and the shared
get_connected_services() helper it reuses. In-memory SQLite, no n8n/Postgres.
The app is built locally with dependency overrides so main.py (and its Mongo /
Postgres side effects) is never imported.
"""

import uuid
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core import ai_providers as ap
from app.core.auth import get_current_user
from app.database import Base, get_postgres_db
from app.models.integration import Integration
from app.models.user import User
from app.routers.ai_provider_router import router
from app.services import integration_service as svc

CONN_A = uuid.UUID("aaaaaaaa-0000-4000-8000-000000000001")
CONN_OLD = uuid.UUID("bbbbbbbb-0000-4000-8000-000000000002")
USER = uuid.uuid4()
OTHER_USER = uuid.uuid4()


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine, tables=[User.__table__, Integration.__table__])
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def _row(db, service, stamp, *, user=USER, active=True):
    db.add(
        Integration(
            user_id=user,
            service=service,
            display_name=service,
            n8n_credential_id="cred",
            n8n_credential_type=f"{service}Api",
            n8n_connection_id=stamp,
            auth_option_id="api_key",
            connection_pattern="text_fields",
            is_active=active,
            oauth_pending=False,
        )
    )
    db.commit()


def _client(db, connection_id=CONN_A):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_postgres_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=USER, n8n_connection_id=connection_id
    )
    return TestClient(app)


def _by_service(resp):
    assert resp.status_code == 200
    return {p["service"]: p for p in resp.json()}


# ------------------------------------------------------ get_connected_services


def test_get_connected_services_only_fresh_active_rows(db):
    _row(db, "groq", CONN_A)
    _row(db, "openai", CONN_OLD)  # stale
    _row(db, "anthropic", None)  # legacy unstamped
    _row(db, "gemini", CONN_A, active=False)  # toggled off
    _row(db, "mistral", CONN_A, user=OTHER_USER)  # someone else's
    assert svc.get_connected_services(db, USER, n8n_connection_id=CONN_A) == {"groq"}


def test_get_connected_services_empty_without_a_connection(db):
    _row(db, "groq", CONN_A)
    _row(db, "openai", None)
    assert svc.get_connected_services(db, USER, n8n_connection_id=None) == set()


def test_check_required_integrations_still_uses_the_helper(db):
    _row(db, "groq", CONN_A)
    res = svc.check_required_integrations(
        db,
        USER,
        [{"service": "groq"}, {"service": "openai"}],
        n8n_connection_id=CONN_A,
    )
    assert {r["service"]: r["connected"] for r in res["integrations"]} == {
        "groq": True,
        "openai": False,
    }
    assert res["all_required_available"] is False


# ------------------------------------------------------------ GET /ai-providers


def test_lists_every_catalog_provider_in_catalog_order(db):
    resp = _client(db).get("/ai-providers")
    assert [p["service"] for p in resp.json()] == [
        p.key for p in ap.list_ai_providers()
    ]


def test_entry_shape_matches_the_catalog(db):
    groq = _by_service(_client(db).get("/ai-providers"))["groq"]
    cat = ap.get_ai_provider("groq")
    assert groq["display_name"] == cat.display_name
    assert groq["default_model"] == cat.default_model
    assert groq["models"] == list(cat.models)
    assert groq["allow_custom_model"] is True
    assert groq["available"] is True
    assert ".lmChat" in groq["node_type"]
    assert groq["node_type_version"] is not None


def test_nothing_connected_by_default(db):
    got = _by_service(_client(db).get("/ai-providers"))
    assert not any(p["connected"] for p in got.values())


def test_connected_flag_follows_fresh_active_rows(db):
    _row(db, "groq", CONN_A)
    _row(db, "openai", CONN_OLD)
    _row(db, "anthropic", CONN_A, active=False)
    _row(db, "gemini", CONN_A, user=OTHER_USER)
    got = _by_service(_client(db).get("/ai-providers"))
    assert {k for k, v in got.items() if v["connected"]} == {"groq"}


def test_user_without_n8n_sees_nothing_connected(db):
    _row(db, "groq", CONN_A)
    got = _by_service(_client(db, connection_id=None).get("/ai-providers"))
    assert not any(p["connected"] for p in got.values())


def test_provider_without_a_resolvable_node_is_unavailable_not_dropped(db, monkeypatch):
    monkeypatch.setattr(
        "app.core.ai_providers.get_chat_model_node",
        lambda key: (
            None if key == "mistral" else {"type": "x.lmChatY", "typeVersion": 1}
        ),
    )
    got = _by_service(_client(db).get("/ai-providers"))
    assert got["mistral"]["available"] is False
    assert got["mistral"]["node_type"] is None
    assert got["groq"]["available"] is True
