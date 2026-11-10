"""
Step 1.7: each user's OAuth callback URL is their OWN n8n's callback, not a global setting.

Covers the helper, GET /users/me/n8n (via _status), and POST /integrations/oauth/connect.
The endpoint is called as a plain coroutine with a stubbed service layer, so no DB or n8n
is needed.
"""

import asyncio
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.core.config import settings
from app.core.n8n_url import OAUTH_CALLBACK_PATH, oauth_callback_url
from app.routers import integration_router, n8n_settings
from app.schemas.integration import OAuthConnectInitRequest, OAuthConnectInitResponse


def _user(base_url):
    return SimpleNamespace(
        id=uuid.uuid4(),
        n8n_configured=base_url is not None,
        n8n_base_url=base_url,
        n8n_email="owner@example.com" if base_url else None,
        n8n_connected_at=datetime.now(timezone.utc) if base_url else None,
    )


def _body():
    return OAuthConnectInitRequest(
        service="gmail", client_id="cid", client_secret="csecret"
    )


def _run_connect(monkeypatch, user, service_result):
    async def fake_init(*args, **kwargs):
        return service_result

    monkeypatch.setattr(
        integration_router.integration_service, "connect_oauth_init", fake_init
    )
    return asyncio.run(
        integration_router.connect_oauth(
            _body(), db=None, current_user=user, n8n=object()
        )
    )


# ---------------- helper ----------------


@pytest.mark.parametrize(
    "base_url, expected",
    [
        (
            "https://n8n.example.com",
            "https://n8n.example.com/rest/oauth2-credential/callback",
        ),
        (
            "https://n8n.example.com/",
            "https://n8n.example.com/rest/oauth2-credential/callback",
        ),
        (
            "http://localhost:5678",
            "http://localhost:5678/rest/oauth2-credential/callback",
        ),
        (
            "http://localhost:5679/",
            "http://localhost:5679/rest/oauth2-credential/callback",
        ),
    ],
)
def test_helper_builds_single_slash_url(base_url, expected):
    assert oauth_callback_url(base_url) == expected
    assert "//rest" not in oauth_callback_url(base_url)


def test_helper_uses_fixed_n8n_path():
    assert OAUTH_CALLBACK_PATH == "/rest/oauth2-credential/callback"


# ---------------- GET /users/me/n8n ----------------


def test_status_callback_is_per_user():
    a = n8n_settings._status(_user("http://localhost:5678"))
    b = n8n_settings._status(_user("http://localhost:5679"))
    assert (
        a.oauth_callback_url == "http://localhost:5678/rest/oauth2-credential/callback"
    )
    assert (
        b.oauth_callback_url == "http://localhost:5679/rest/oauth2-credential/callback"
    )
    assert a.oauth_callback_url != b.oauth_callback_url


def test_status_callback_follows_stored_base_url():
    user = _user("https://one.example.com")
    first = n8n_settings._status(user).oauth_callback_url
    user.n8n_base_url = "https://two.example.com"
    second = n8n_settings._status(user).oauth_callback_url
    assert first == "https://one.example.com/rest/oauth2-credential/callback"
    assert second == "https://two.example.com/rest/oauth2-credential/callback"


def test_status_unconfigured_has_no_callback():
    status = n8n_settings._status(_user(None))
    assert status.configured is False
    assert status.oauth_callback_url is None


# ---------------- POST /integrations/oauth/connect ----------------


def test_oauth_connect_returns_users_own_callback(monkeypatch):
    service_result = {
        "service": "gmail",
        "auth_option": "oauth2",
        "n8n_credential_id": "cred-1",
        "authorization_url": "https://accounts.google.com/o/oauth2/auth?x=1",
    }
    out_a = _run_connect(
        monkeypatch, _user("http://localhost:5678"), dict(service_result)
    )
    out_b = _run_connect(
        monkeypatch, _user("http://localhost:5679/"), dict(service_result)
    )

    assert (
        out_a.oauth_callback_url
        == "http://localhost:5678/rest/oauth2-credential/callback"
    )
    assert (
        out_b.oauth_callback_url
        == "http://localhost:5679/rest/oauth2-credential/callback"
    )
    # the service's own fields pass through untouched
    assert out_a.authorization_url == service_result["authorization_url"]
    assert out_a.n8n_credential_id == "cred-1"


def test_oauth_connect_accepts_model_result(monkeypatch):
    service_result = OAuthConnectInitResponse(
        service="gmail",
        auth_option="oauth2",
        n8n_credential_id="cred-2",
        authorization_url="https://example.com/auth",
    )
    out = _run_connect(monkeypatch, _user("https://n8n.example.com"), service_result)
    assert (
        out.oauth_callback_url
        == "https://n8n.example.com/rest/oauth2-credential/callback"
    )
    assert out.n8n_credential_id == "cred-2"


# ---------------- legacy global setting is gone ----------------


def test_global_redirect_setting_removed():
    assert not hasattr(settings, "N8N_OAUTH_REDIRECT_URI")
