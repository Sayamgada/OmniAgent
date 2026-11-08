import logging

import httpx
import pytest

from app.core.n8n_errors import describe_n8n_error, is_n8n_not_found, n8n_http_error
from app.services.n8n_client import N8nClientError

SECRET = "SECRET-INTERNAL-BODY"


def _err(status: int | None) -> N8nClientError:
    return N8nClientError(
        f"n8n call failed ({status})", status_code=status, detail={"message": SECRET}
    )


@pytest.mark.parametrize("status", [400, 401, 403, 404, 500, None])
def test_message_never_contains_response_body(status):
    err = n8n_http_error("create_workflow", _err(status), "Could not create it")
    assert err.status_code == 502
    assert SECRET not in str(err.detail)


@pytest.mark.parametrize("status", [401, 403])
def test_auth_failures_point_at_settings(status):
    msg = describe_n8n_error("step", _err(status))
    assert "n8n settings" in msg and str(status) in msg


def test_other_status_is_reported_by_code():
    assert "HTTP 400" in describe_n8n_error("step", _err(400))


def test_transport_failure_is_unreachable():
    msg = describe_n8n_error("step", httpx.ConnectError("boom"))
    assert "Could not reach" in msg


def test_malformed_reply_without_status():
    assert "unexpected response" in describe_n8n_error("step", _err(None))


def test_not_found_detection():
    assert is_n8n_not_found(_err(404))
    assert not is_n8n_not_found(_err(500))
    assert not is_n8n_not_found(httpx.ConnectError("boom"))


def test_log_has_step_and_status_only(caplog):
    with caplog.at_level(logging.WARNING, logger="app.core.n8n_errors"):
        describe_n8n_error("create_workflow", _err(400))
    assert "step=create_workflow status=400" in caplog.text
    assert SECRET not in caplog.text
