"""
Validation of the user-supplied n8n base URL (SSRF guard).

The backend makes server-side requests to whatever URL a user saves, so it must refuse
internal targets. Checks, in order:
  - scheme: https only (http also allowed when settings.N8N_ALLOW_PRIVATE_HOSTS is true, dev only)
  - no userinfo, no path/query/fragment (just scheme://host[:port])
  - hostname is resolved and EVERY returned address must be globally routable
    (blocks private, loopback, link-local incl. 169.254.169.254, reserved, multicast,
    unspecified, shared 100.64/10, and IPv4-mapped IPv6 forms of those)
Redirects are disabled in N8nClient (follow_redirects=False).

KNOWN GAP (hardening pass): there is a small DNS-rebinding window between this check and the
actual connection. Closing it fully means connecting to the resolved IP and passing the
hostname via Host header / sni_hostname.
"""

import asyncio
import ipaddress
import socket
from urllib.parse import urlsplit

from app.core.config import settings


class N8nUrlError(ValueError):
    """Message is safe to show to the end user."""


async def _resolve(host: str, port: int) -> set[str]:
    loop = asyncio.get_running_loop()
    infos = await loop.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    return {info[4][0] for info in infos}


def _is_public(addr: str) -> bool:
    ip = ipaddress.ip_address(addr.split("%", 1)[0])  # drop IPv6 zone id
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


OAUTH_CALLBACK_PATH = "/rest/oauth2-credential/callback"


def oauth_callback_url(base_url: str) -> str:
    """
    The redirect URI a user registers in their own Google/GitHub/... OAuth app: n8n's fixed
    callback route on THEIR instance. validate_n8n_url already stores the base URL without a
    trailing slash; stripping here as well keeps this safe for any value that reaches it.
    """
    return f"{base_url.rstrip('/')}{OAUTH_CALLBACK_PATH}"


async def validate_n8n_url(raw: str) -> str:
    """Returns the normalized base URL (no trailing slash) or raises N8nUrlError."""
    allow_private = bool(getattr(settings, "N8N_ALLOW_PRIVATE_HOSTS", False))
    raw = (raw or "").strip()
    if not raw or len(raw) > 500:
        raise N8nUrlError("Enter your n8n URL, e.g. https://n8n.example.com")

    try:
        parts = urlsplit(raw)
        port = parts.port
    except ValueError:
        raise N8nUrlError("That does not look like a valid URL.")

    scheme = parts.scheme.lower()
    allowed = {"https"} | ({"http"} if allow_private else set())
    if scheme not in allowed:
        raise N8nUrlError("The n8n URL must start with https://")
    if parts.username or parts.password:
        raise N8nUrlError("The URL must not contain a username or password.")
    host = parts.hostname
    if not host:
        raise N8nUrlError("That does not look like a valid URL.")
    if parts.path not in ("", "/") or parts.query or parts.fragment:
        raise N8nUrlError(
            "Enter only the base URL (e.g. https://n8n.example.com), with no path or query."
        )

    try:
        addrs = await _resolve(host, port or (443 if scheme == "https" else 80))
    except OSError:
        raise N8nUrlError("Could not resolve that host name.")
    if not addrs:
        raise N8nUrlError("Could not resolve that host name.")
    if not allow_private and not all(_is_public(a) for a in addrs):
        raise N8nUrlError(
            "That address is not allowed: it points to a private or internal network."
        )

    return f"{scheme}://{parts.netloc.lower()}"
