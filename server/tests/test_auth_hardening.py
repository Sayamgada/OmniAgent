"""
Auth hardening: signup can only create local accounts, and the Google callback
behaves as implemented in commit 3b302ab:

  - every Google failure redirects to <frontend>/sign-in?error=... (never raises)
  - an existing email/password account with no Google link yet is LINKED on its
    first Google login (accepted trade-off, see the NOTE in routers/auth.py:
    signup does not verify email ownership)
  - an account already linked to a different Google sub is rejected
  - deactivated accounts are rejected
"""

import asyncio
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

import pytest

from app.routers import auth as auth_router
from app.schemas.user import UserCreate, UserOut, UserSignup

SUB = "google-sub-123"


def _userinfo(**kw):
    info = {
        "email": "victim@example.com",
        "name": "Victim",
        "sub": SUB,
        "email_verified": True,
    }
    info.update(kw)
    return info


class FakeDb:
    def __init__(self):
        self.commits = 0

    def commit(self):
        self.commits += 1


@pytest.fixture
def google(monkeypatch):
    """Fake Google + user store: no network, no database."""
    state = SimpleNamespace(
        userinfo=_userinfo(), existing=None, created=[], token_error=False, db=FakeDb()
    )

    async def authorize_access_token(_request):
        if state.token_error:
            raise RuntimeError("google exploded")
        return {"userinfo": state.userinfo}

    def get_user_by_email(_db, _email):
        return state.existing

    def create_user(_db, user):
        state.created.append(user)
        return SimpleNamespace(
            email=user.email,
            full_name=user.full_name,
            provider=user.provider,
            provider_id=user.provider_id,
            is_active=True,
        )

    monkeypatch.setattr(
        auth_router,
        "oauth",
        SimpleNamespace(
            google=SimpleNamespace(authorize_access_token=authorize_access_token)
        ),
    )
    monkeypatch.setattr(auth_router, "get_user_by_email", get_user_by_email)
    monkeypatch.setattr(auth_router, "create_user", create_user)
    return state


def _callback(state):
    return asyncio.run(auth_router.google_callback(request=object(), db=state.db))


def _existing(provider, provider_id=None, **kw):
    user = SimpleNamespace(
        email="victim@example.com",
        full_name="Victim",
        provider=provider,
        provider_id=provider_id,
        password="stored-hash" if provider == "local" else None,
        is_active=True,
    )
    for k, v in kw.items():
        setattr(user, k, v)
    return user


def _error_of(resp) -> str:
    """Asserts the response is a redirect to the sign-in page and returns its error text."""
    assert resp.status_code == 307
    loc = urlparse(resp.headers["location"])
    assert loc.path == "/sign-in"
    return parse_qs(loc.query)["error"][0]


def _token_of(resp) -> str:
    loc = urlparse(resp.headers["location"])
    assert loc.path == "/oauth/callback"
    (token,) = parse_qs(loc.query)["token"]
    assert token
    return token


# ---------------- signup ----------------


def test_signup_schema_drops_client_supplied_provider_fields():
    body = UserSignup.model_validate(
        {
            "email": "a@b.com",
            "password": "longenough1",
            "provider": "google",
            "provider_id": "x",
        }
    )
    assert not hasattr(body, "provider")
    assert not hasattr(body, "provider_id")


def test_signup_always_creates_a_local_account(monkeypatch):
    created = []
    monkeypatch.setattr(auth_router, "get_user_by_email", lambda _db, _e: None)
    monkeypatch.setattr(
        auth_router, "create_user", lambda _db, u: created.append(u) or u
    )

    # a hostile client sends provider fields; the schema discards them
    body = UserSignup.model_validate(
        {
            "email": "a@b.com",
            "password": "longenough1",
            "provider": "google",
            "provider_id": "x",
        }
    )
    auth_router.signup(body, db=None)

    (user,) = created
    assert isinstance(user, UserCreate)
    assert user.provider == "local"
    assert user.provider_id is None


def test_user_out_never_exposes_the_password():
    assert "password" not in UserOut.model_fields


def test_user_out_never_exposes_n8n_secrets():
    for field in UserOut.model_fields:
        assert not field.startswith("n8n_")


# ---------------- google callback: success paths ----------------


def test_new_verified_google_user_is_created_and_gets_a_token(google):
    resp = _callback(google)

    (created,) = google.created
    assert created.provider == "google"
    assert created.provider_id == SUB
    assert created.password is None
    _token_of(resp)


def test_existing_google_account_with_the_same_sub_signs_in(google):
    google.existing = _existing("google", SUB)
    resp = _callback(google)
    _token_of(resp)
    assert google.created == []
    assert google.db.commits == 0


def test_existing_local_account_is_linked_on_first_google_login(google):
    # Current, deliberate behavior (3b302ab): link instead of rejecting.
    # Password and provider are left untouched so both sign-in methods keep working.
    # This documents the accepted trade-off: signup does not verify email ownership.
    existing = _existing("local")
    google.existing = existing

    resp = _callback(google)

    _token_of(resp)
    assert existing.provider_id == SUB
    assert existing.provider == "local"
    assert existing.password == "stored-hash"
    assert google.created == []
    assert google.db.commits == 1


def test_linking_fills_a_missing_full_name(google):
    existing = _existing("local", full_name=None)
    google.existing = existing
    _callback(google)
    assert existing.full_name == "Victim"


# ---------------- google callback: rejection paths ----------------


def test_existing_google_account_with_a_different_sub_is_rejected(google):
    google.existing = _existing("google", "someone-elses-sub")
    resp = _callback(google)
    assert "different Google account" in _error_of(resp)
    assert google.created == []
    assert google.db.commits == 0


def test_deactivated_account_is_rejected(google):
    google.existing = _existing("local", is_active=False)
    resp = _callback(google)
    assert "deactivated" in _error_of(resp)
    assert google.db.commits == 0


@pytest.mark.parametrize("verified", [False, None, "false"])
def test_unverified_google_email_is_rejected(google, verified):
    google.userinfo = _userinfo(email_verified=verified)
    resp = _callback(google)
    assert "not verified" in _error_of(resp)
    assert google.created == []


def test_google_response_without_an_email_or_sub_is_rejected(google):
    google.userinfo = _userinfo(sub=None)
    resp = _callback(google)
    assert "email" in _error_of(resp).lower()
    assert google.created == []


def test_google_token_exchange_failure_redirects_with_an_error(google):
    google.token_error = True
    resp = _callback(google)
    assert "failed" in _error_of(resp).lower()
    assert google.created == []
