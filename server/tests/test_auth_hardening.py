"""
Auth hardening: signup can only create local accounts, and Google sign-in can
never hand over an account it did not create (pre-hijack).
"""

import asyncio
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi import HTTPException

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


@pytest.fixture
def google(monkeypatch):
    """Fake Google + user store: no network, no database."""
    state = SimpleNamespace(userinfo=_userinfo(), existing=None, created=[])

    async def authorize_access_token(_request):
        return {"userinfo": state.userinfo}

    def get_user_by_email(_db, _email):
        return state.existing

    def create_user(_db, user):
        state.created.append(user)
        return SimpleNamespace(
            email=user.email, provider=user.provider, provider_id=user.provider_id
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


def _callback():
    return asyncio.run(auth_router.google_callback(request=object(), db=None))


def _existing(provider, provider_id=None):
    return SimpleNamespace(
        email="victim@example.com", provider=provider, provider_id=provider_id
    )


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


# ---------------- google callback ----------------


def test_new_verified_google_user_is_created_and_gets_a_token(google):
    resp = _callback()

    (created,) = google.created
    assert created.provider == "google"
    assert created.provider_id == SUB
    assert created.password is None
    qs = parse_qs(urlparse(resp.headers["location"]).query)
    assert qs["token"] and qs["token"][0]


def test_existing_local_account_is_never_handed_to_a_google_login(google):
    # the pre-hijack: attacker registered victim@example.com with a password first
    google.existing = _existing("local")

    with pytest.raises(HTTPException) as exc:
        _callback()

    assert exc.value.status_code == 409
    assert google.created == []


def test_existing_google_account_with_the_same_sub_signs_in(google):
    google.existing = _existing("google", SUB)
    resp = _callback()
    assert "token=" in resp.headers["location"]
    assert google.created == []


def test_existing_google_account_with_a_different_sub_is_rejected(google):
    google.existing = _existing("google", "someone-elses-sub")
    with pytest.raises(HTTPException) as exc:
        _callback()
    assert exc.value.status_code == 409


@pytest.mark.parametrize("verified", [False, None, "false"])
def test_unverified_google_email_is_rejected(google, verified):
    google.userinfo = _userinfo(email_verified=verified)
    with pytest.raises(HTTPException) as exc:
        _callback()
    assert exc.value.status_code == 400
    assert google.created == []


def test_google_response_without_an_email_or_sub_is_rejected(google):
    google.userinfo = _userinfo(sub=None)
    with pytest.raises(HTTPException) as exc:
        _callback()
    assert exc.value.status_code == 400
