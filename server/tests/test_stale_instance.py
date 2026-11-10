"""
tests/test_stale_instance.py

Plan task 1.6 (instance-change guard) at the service / resolver / checker level. An
Integration (or Agent) row is STALE when its n8n_connection_id stamp is NULL or differs from
the user's current connection id; stale rows must never count as connected, never be sent to
n8n, and always be removable. In-memory SQLite, fake n8n client; no n8n or Postgres needed.
"""

import asyncio
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.compiler.credential_resolver import PostgresCredentialResolver
from app.core.integration_catalog import INTEGRATION_CATALOG, get_auth_option
from app.core.n8n_stale import fresh_clause, is_stale
from app.database import Base
from app.models.integration import Integration
from app.models.user import User
from app.services import integration_service as svc
from app.services.credential_checker import check_required_integrations as checker

CONN_A = uuid.UUID(
    "aaaaaaaa-0000-4000-8000-000000000001"
)  # the user's CURRENT instance
CONN_OLD = uuid.UUID("bbbbbbbb-0000-4000-8000-000000000002")  # a previous instance


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine, tables=[User.__table__, Integration.__table__])
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


USER = uuid.uuid4()


def _row(db, service, stamp, *, active=True, cred="old-cred", pending=False):
    row = Integration(
        user_id=USER,
        service=service,
        display_name=service,
        n8n_credential_id=cred,
        n8n_credential_type=f"{service}Api",
        n8n_connection_id=stamp,
        auth_option_id="api_key",
        connection_pattern="text_fields",
        is_active=active,
        oauth_pending=pending,
    )
    db.add(row)
    db.commit()
    return row


class FakeClient:
    """Stands in for N8nClient on the credential paths."""

    def __init__(self, connection_id):
        self.connection_id = connection_id
        self.calls = []

    async def create_credential(self, name, credential_type, data):
        self.calls.append(("create", credential_type))
        return {"id": "new-cred"}

    async def delete_credential(self, cred_id):
        self.calls.append(("delete", cred_id))

    async def is_oauth_credential_connected(self, cred_id):
        self.calls.append(("oauth_status", cred_id))
        return True


def _text_fields_service():
    """A catalog service whose default auth option is plain text fields (all strings)."""
    for service in INTEGRATION_CATALOG:
        opt = get_auth_option(service, None)
        if (
            opt
            and opt["connection_pattern"] == 1
            and opt["fields"]
            and all(f.get("type") in ("string", "password") for f in opt["fields"])
        ):
            return service, opt
    pytest.skip("no all-string text-fields service in the catalog")


def _values(opt):
    return {f["name"]: "x" for f in opt["fields"]}


# ---------------------------------------------------------------- the predicate


@pytest.mark.parametrize(
    "stamp, current, expected",
    [
        (CONN_A, CONN_A, False),
        (str(CONN_A), CONN_A, False),  # str vs UUID must not read as a mismatch
        (CONN_OLD, CONN_A, True),
        (None, CONN_A, True),  # unstamped legacy row
        (CONN_A, None, True),  # user has no n8n connected
        (None, None, True),  # both missing is NOT "equal"
    ],
)
def test_is_stale_truth_table(stamp, current, expected):
    assert is_stale(stamp, current) is expected


def test_fresh_clause_is_null_safe(db):
    _row(db, "stripe", None)
    _row(db, "slack", CONN_A)
    q = db.query(Integration.service)
    # no current connection: nothing is fresh -- NOT "IS NULL", which would match the legacy row
    assert q.filter(fresh_clause(Integration.n8n_connection_id, None)).all() == []
    got = q.filter(fresh_clause(Integration.n8n_connection_id, CONN_A)).all()
    assert [r.service for r in got] == ["slack"]
    assert q.filter(fresh_clause(Integration.n8n_connection_id, CONN_OLD)).all() == []


# ---------------------------------------------------------------- resolver + checkers


def test_resolver_returns_only_fresh_active_rows(db):
    _row(db, "slack", CONN_A, cred="slack-cred")
    _row(db, "stripe", CONN_OLD)
    _row(db, "github", None)
    _row(db, "notion", CONN_A, active=False)
    resolver = PostgresCredentialResolver(db, n8n_connection_id=CONN_A)
    hit = resolver.resolve(str(USER), "slack", "slackApi")
    assert hit is not None and hit["id"] == "slack-cred"
    for service in ("stripe", "github", "notion", "missing"):
        assert resolver.resolve(str(USER), service, "x") is None


def test_resolver_finds_nothing_when_user_has_no_connection(db):
    _row(db, "slack", None)  # unstamped legacy row must not match a None connection
    _row(db, "stripe", CONN_A)
    resolver = PostgresCredentialResolver(db, n8n_connection_id=None)
    assert resolver.resolve(str(USER), "slack", "x") is None
    assert resolver.resolve(str(USER), "stripe", "x") is None


def test_credential_checker_counts_only_fresh_rows(db):
    _row(db, "slack", CONN_A)
    _row(db, "stripe", CONN_OLD)
    _row(db, "github", None)
    req = [{"service": s} for s in ("slack", "stripe", "github")]
    out = checker(db, USER, req, n8n_connection_id=CONN_A)
    assert {r["service"]: r["available"] for r in out} == {
        "slack": True,
        "stripe": False,
        "github": False,
    }
    out = checker(db, USER, req, n8n_connection_id=None)
    assert not any(r["available"] for r in out)


def test_integration_service_check_counts_only_fresh_rows(db):
    _row(db, "slack", CONN_A)
    _row(db, "stripe", CONN_OLD)
    req = [{"service": "slack"}, {"service": "stripe"}]
    res = svc.check_required_integrations(db, USER, req, n8n_connection_id=CONN_A)
    assert {r["service"]: r["connected"] for r in res["integrations"]} == {
        "slack": True,
        "stripe": False,
    }
    assert res["all_required_available"] is False


def test_list_reports_stale_row_as_configured_not_connected(db):
    fresh_service, stale_service = list(INTEGRATION_CATALOG)[:2]
    _row(db, fresh_service, CONN_A)
    _row(db, stale_service, CONN_OLD)
    entries = {
        e["service"]: e
        for e in svc.list_integrations_with_status(db, USER, n8n_connection_id=CONN_A)
    }
    fresh, stale = entries[fresh_service], entries[stale_service]
    assert (fresh["connected"], fresh["configured"], fresh["stale"]) == (
        True,
        True,
        False,
    )
    assert fresh["connected_option"] == "api_key"
    assert (stale["connected"], stale["configured"], stale["stale"]) == (
        False,
        True,
        True,
    )
    assert stale["connected_option"] is None
    untouched = [
        e for s, e in entries.items() if s not in (fresh_service, stale_service)
    ]
    assert untouched and not any(e["stale"] or e["configured"] for e in untouched)


# ---------------------------------------------------------------- connect / reconnect


def test_connect_stamps_a_new_row_with_the_clients_connection(db):
    service, opt = _text_fields_service()
    n8n = FakeClient(CONN_A)
    row = asyncio.run(svc.connect_text_fields(db, USER, service, _values(opt), n8n=n8n))
    assert row.n8n_connection_id == CONN_A
    assert row.n8n_credential_id == "new-cred"
    assert [c[0] for c in n8n.calls] == ["create"]


def test_reconnect_over_a_fresh_row_deletes_the_old_credential(db):
    service, opt = _text_fields_service()
    _row(db, service, CONN_A, cred="old-cred")
    n8n = FakeClient(CONN_A)
    row = asyncio.run(svc.connect_text_fields(db, USER, service, _values(opt), n8n=n8n))
    assert ("delete", "old-cred") in n8n.calls
    assert row.n8n_credential_id == "new-cred" and row.n8n_connection_id == CONN_A


@pytest.mark.parametrize("old_stamp", [CONN_OLD, None])
def test_reconnect_over_a_stale_row_never_deletes_and_restamps(db, old_stamp):
    service, opt = _text_fields_service()
    _row(db, service, old_stamp, cred="old-cred", active=False)
    n8n = FakeClient(CONN_A)
    row = asyncio.run(svc.connect_text_fields(db, USER, service, _values(opt), n8n=n8n))
    # the old id belongs to another instance: deleting it here could hit a different credential
    assert not any(c[0] == "delete" for c in n8n.calls)
    assert row.n8n_credential_id == "new-cred"
    assert row.n8n_connection_id == CONN_A
    assert row.is_active is True


# ---------------------------------------------------------------- disconnect


def test_disconnect_stale_row_needs_no_n8n(db):
    _row(db, "slack", CONN_OLD)
    asyncio.run(
        svc.disconnect_integration(db, USER, "slack", n8n=None, n8n_connection_id=None)
    )
    assert db.query(Integration).count() == 0


def test_disconnect_stale_row_makes_no_n8n_call_even_with_a_client(db):
    _row(db, "slack", CONN_OLD)
    n8n = FakeClient(CONN_A)
    asyncio.run(
        svc.disconnect_integration(db, USER, "slack", n8n=n8n, n8n_connection_id=CONN_A)
    )
    assert n8n.calls == []
    assert db.query(Integration).count() == 0


def test_disconnect_fresh_row_without_a_client_is_409_and_keeps_row(db):
    _row(db, "slack", CONN_A)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            svc.disconnect_integration(
                db, USER, "slack", n8n=None, n8n_connection_id=CONN_A
            )
        )
    assert exc.value.status_code == 409
    assert exc.value.detail["code"] == "n8n_not_configured"
    assert db.query(Integration).count() == 1


def test_disconnect_fresh_row_deletes_the_n8n_credential(db):
    _row(db, "slack", CONN_A, cred="slack-cred")
    n8n = FakeClient(CONN_A)
    asyncio.run(
        svc.disconnect_integration(db, USER, "slack", n8n=n8n, n8n_connection_id=CONN_A)
    )
    assert n8n.calls == [("delete", "slack-cred")]
    assert db.query(Integration).count() == 0


# ---------------------------------------------------------------- oauth status


def test_oauth_status_for_a_stale_pending_row_does_not_poll(db):
    _row(db, "slack", CONN_OLD, active=False, pending=True)
    n8n = FakeClient(CONN_A)
    out = asyncio.run(svc.check_oauth_status(db, USER, "slack", n8n=n8n))
    assert out == {"service": "slack", "connected": False, "pending": False}
    assert n8n.calls == []


def test_oauth_status_for_a_fresh_pending_row_still_polls(db):
    _row(db, "slack", CONN_A, active=False, pending=True, cred="slack-cred")
    n8n = FakeClient(CONN_A)
    out = asyncio.run(svc.check_oauth_status(db, USER, "slack", n8n=n8n))
    assert out == {"service": "slack", "connected": True, "pending": False}
    assert n8n.calls == [("oauth_status", "slack-cred")]
