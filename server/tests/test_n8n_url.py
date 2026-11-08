import asyncio

import pytest

from app.core import n8n_url as nu


def run(coro):
    return asyncio.run(coro)


def resolver(*addrs):
    async def fake(host, port):
        return set(addrs)

    return fake


@pytest.fixture(autouse=True)
def _flag_off(monkeypatch):
    monkeypatch.setattr(nu.settings, "N8N_ALLOW_PRIVATE_HOSTS", False, raising=False)


def test_public_https_ok_and_normalised(monkeypatch):
    monkeypatch.setattr(nu, "_resolve", resolver("93.184.216.34"))
    assert (
        run(nu.validate_n8n_url("  HTTPS://N8N.Example.com:8443/ "))
        == "https://n8n.example.com:8443"
    )


@pytest.mark.parametrize(
    "addr",
    [
        "127.0.0.1",
        "10.0.0.5",
        "192.168.1.10",
        "172.16.0.1",
        "169.254.169.254",
        "100.64.0.1",
        "0.0.0.0",
        "::1",
        "fe80::1",
        "fd00::1",
        "::ffff:127.0.0.1",
        "::ffff:169.254.169.254",
    ],
)
def test_non_public_addresses_rejected(monkeypatch, addr):
    monkeypatch.setattr(nu, "_resolve", resolver(addr))
    with pytest.raises(nu.N8nUrlError):
        run(nu.validate_n8n_url("https://n8n.example.com"))


def test_one_private_among_public_rejected(monkeypatch):
    monkeypatch.setattr(nu, "_resolve", resolver("93.184.216.34", "10.0.0.5"))
    with pytest.raises(nu.N8nUrlError):
        run(nu.validate_n8n_url("https://n8n.example.com"))


@pytest.mark.parametrize(
    "url",
    [
        "http://n8n.example.com",
        "ftp://n8n.example.com",
        "n8n.example.com",
        "https://user:pw@n8n.example.com",
        "https://n8n.example.com/path",
        "https://n8n.example.com?x=1",
        "https://n8n.example.com#frag",
        "",
        "https://",
        "https://n8n.example.com:notaport",
    ],
)
def test_bad_shapes_rejected(monkeypatch, url):
    monkeypatch.setattr(nu, "_resolve", resolver("93.184.216.34"))
    with pytest.raises(nu.N8nUrlError):
        run(nu.validate_n8n_url(url))


def test_unresolvable_rejected(monkeypatch):
    async def boom(host, port):
        raise OSError("nope")

    monkeypatch.setattr(nu, "_resolve", boom)
    with pytest.raises(nu.N8nUrlError):
        run(nu.validate_n8n_url("https://nope.invalid"))


def test_dev_flag_allows_http_and_private(monkeypatch):
    monkeypatch.setattr(nu.settings, "N8N_ALLOW_PRIVATE_HOSTS", True, raising=False)
    monkeypatch.setattr(nu, "_resolve", resolver("127.0.0.1"))
    assert run(nu.validate_n8n_url("http://localhost:5679")) == "http://localhost:5679"
