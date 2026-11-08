import asyncio
import uuid
from types import SimpleNamespace

import pytest

from app.services import n8n_client as nc  # adjust import path to where n8n_client.py lives
from app.utils.crypto import encrypt_value


@pytest.fixture(autouse=True)
def _clean_cache():
    nc._sessions.clear()
    nc._login_locks.clear()
    yield
    nc._sessions.clear()
    nc._login_locks.clear()


def _user(**over):
    base = dict(
        id=uuid.uuid4(),
        n8n_base_url="https://n8n.example.com/",
        n8n_api_key_enc=encrypt_value("api-key-1"),
        n8n_email="owner@example.com",
        n8n_password_enc=encrypt_value("pw-1"),
        n8n_connection_id=uuid.uuid4(),
    )
    base.update(over)
    u = SimpleNamespace(**base)
    u.n8n_configured = all(
        (
            u.n8n_base_url,
            u.n8n_api_key_enc,
            u.n8n_email,
            u.n8n_password_enc,
            u.n8n_connection_id,
        )
    )
    return u


def _client(user=None):
    return nc.get_n8n_client(user or _user())


def test_gate_raises_when_unconfigured():
    u = _user(
        n8n_base_url=None,
        n8n_api_key_enc=None,
        n8n_email=None,
        n8n_password_enc=None,
        n8n_connection_id=None,
    )
    with pytest.raises(nc.N8nNotConfigured) as exc:
        nc.get_n8n_client(u)
    assert exc.value.code == "n8n_not_configured"


def test_gate_raises_when_partially_configured():
    with pytest.raises(nc.N8nNotConfigured):
        nc.get_n8n_client(_user(n8n_password_enc=None))


def test_encryption_round_trip_and_url_normalised():
    c = _client()
    assert c._api_key == "api-key-1"
    assert c._password == "pw-1"
    assert c.base_url == "https://n8n.example.com"
    assert "api-key-1" not in repr(c) and "pw-1" not in repr(c)


def test_sessions_isolated_per_user_and_evictable(monkeypatch):
    async def fake_login(self):
        return f"cookie-{self.email}-{self.user_id}"

    monkeypatch.setattr(nc.N8nClient, "_login", fake_login)
    a, b = _client(_user(n8n_email="a@x.com")), _client(_user(n8n_email="b@x.com"))

    async def run():
        ca = await a._get_session_cookie()
        cb = await b._get_session_cookie()
        return ca, cb

    ca, cb = asyncio.run(run())
    assert ca != cb and "a@x.com" in ca and "b@x.com" in cb
    nc.evict_sessions(a.user_id)
    assert a._key not in nc._sessions
    assert b._key in nc._sessions


def test_new_connection_id_does_not_reuse_old_session(monkeypatch):
    calls = []

    async def fake_login(self):
        calls.append(self.connection_id)
        return f"cookie-{len(calls)}"

    monkeypatch.setattr(nc.N8nClient, "_login", fake_login)
    uid = uuid.uuid4()
    c1 = _client(_user(id=uid))
    c2 = _client(_user(id=uid))  # same user, different connection_id

    async def run():
        return await c1._get_session_cookie(), await c2._get_session_cookie()

    s1, s2 = asyncio.run(run())
    assert s1 != s2 and len(calls) == 2


def test_concurrent_logins_collapse_to_one(monkeypatch):
    count = 0

    async def fake_login(self):
        nonlocal count
        count += 1
        await asyncio.sleep(0.05)
        return "cookie"

    monkeypatch.setattr(nc.N8nClient, "_login", fake_login)
    c = _client()

    async def run():
        return await asyncio.gather(*[c._get_session_cookie() for _ in range(10)])

    assert set(asyncio.run(run())) == {"cookie"}
    assert count == 1


def test_stale_refresh_logs_in_once_for_concurrent_401s(monkeypatch):
    count = 0

    async def fake_login(self):
        nonlocal count
        count += 1
        await asyncio.sleep(0.05)
        return "fresh"

    monkeypatch.setattr(nc.N8nClient, "_login", fake_login)
    c = _client()
    nc._sessions[c._key] = "old"

    async def run():
        return await asyncio.gather(
            *[c._get_session_cookie(stale="old") for _ in range(10)]
        )

    assert set(asyncio.run(run())) == {"fresh"}
    assert count == 1
