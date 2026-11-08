"""
Boundary helpers for n8n failures.

The n8n base URL is user-controlled, so an n8n response body (carried inside
N8nClientError's message/detail) must never reach an end user or a log line
verbatim. Every call site that catches an n8n failure turns it into a fixed
message here and logs only the step and the HTTP status code.
"""

import logging

import httpx
from fastapi import HTTPException, status

from app.services.n8n_client import N8nClientError

logger = logging.getLogger(__name__)

# What an n8n call can raise: n8n answered with an error, or could not be reached.
N8N_ERRORS = (N8nClientError, httpx.HTTPError)


def n8n_status(exc: Exception) -> int | None:
    """HTTP status n8n answered with, or None (transport failure / malformed reply)."""
    return exc.status_code if isinstance(exc, N8nClientError) else None


def is_n8n_not_found(exc: Exception) -> bool:
    return n8n_status(exc) == 404


def describe_n8n_error(step: str, exc: Exception) -> str:
    """Fixed, body-free message for `exc`. Logs step + status code only."""
    code = n8n_status(exc)
    logger.warning("n8n call failed: step=%s status=%s", step, code)
    if code in (401, 403):
        return (
            "n8n refused the saved credentials (HTTP %s). Update them in your n8n settings."
            % code
        )
    if code is not None:
        return f"n8n returned an error (HTTP {code})."
    if isinstance(exc, N8nClientError):
        return "n8n returned an unexpected response."
    return "Could not reach your n8n instance."


def n8n_http_error(step: str, exc: Exception, prefix: str) -> HTTPException:
    """502 with a fixed message. Use as `raise n8n_http_error(...) from None`."""
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"{prefix}. {describe_n8n_error(step, exc)}",
    )
