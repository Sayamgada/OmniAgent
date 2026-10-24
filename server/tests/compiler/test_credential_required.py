"""
tests/compiler/test_credential_required.py

credential_required(node_type, type_version): a credential counts as required
only if it is marked required AND applies with the node's DEFAULT parameters.

Part 1 uses synthetic node definitions (independent of n8n's version).
Part 2 asserts properties of the real scripts/nodes.json and is skipped when
that file is absent; it states rules, not a pinned list of node names, so an
n8n upgrade does not break it.
"""

import pytest

from app.compiler import param_schema as P


def _auth(default, values):
    return {
        "name": "authentication",
        "type": "options",
        "default": default,
        "options": [{"name": v, "value": v} for v in values],
    }


def _cred(name, *, required=True, show=None, hide=None):
    c = {"name": name, "required": required}
    opts = {}
    if show:
        opts["show"] = show
    if hide:
        opts["hide"] = hide
    if opts:
        c["displayOptions"] = opts
    return c


def _node(name, *, credentials=None, properties=None, version=1):
    return {
        "name": name,
        "version": [version],
        "defaultVersion": version,
        "properties": properties or [],
        "credentials": credentials or [],
    }


@pytest.fixture
def install(monkeypatch):
    def _install(*entries):
        monkeypatch.setattr(P, "_load_nodes", lambda: list(entries))

    return _install


# ---------------- Part 1: synthetic ----------------


def test_unconditional_required_credential_is_required(install):
    install(_node("n.slackLike", credentials=[_cred("slackApi")]))
    assert P.credential_required("n.slackLike", 1) is True


def test_no_credentials_unknown_node_and_optional_credential_are_not_required(install):
    install(
        _node("n.if"),
        _node("n.optional", credentials=[_cred("x", required=False)]),
    )
    assert P.credential_required("n.if", 1) is False
    assert P.credential_required("n.optional", 1) is False
    assert P.credential_required("n.not_in_nodes_json", 1) is False


def test_pick_one_auth_node_is_required_when_the_default_selects_a_method(install):
    # Airtable / Slack shape: every method is its own entry, default picks one.
    install(
        _node(
            "n.airtableLike",
            properties=[_auth("token", ["token", "oauth"])],
            credentials=[
                _cred("tokenApi", show={"authentication": ["token"]}),
                _cred("oauthApi", show={"authentication": ["oauth"]}),
            ],
        )
    )
    assert P.credential_required("n.airtableLike", 1) is True


def test_selector_defaulting_to_none_means_no_credential_required(install):
    # GraphQL / Webhook / Wait shape: credentials exist but only if you opt in.
    install(
        _node(
            "n.graphqlLike",
            properties=[_auth("none", ["none", "basicAuth", "headerAuth"])],
            credentials=[
                _cred("basic", show={"authentication": ["basicAuth"]}),
                _cred("header", show={"authentication": ["headerAuth"]}),
            ],
        )
    )
    assert P.credential_required("n.graphqlLike", 1) is False


def test_boolean_gate_follows_its_default(install):
    def entry(default):
        return _node(
            "n.ssl",
            properties=[
                {
                    "name": "provideSslCertificates",
                    "type": "boolean",
                    "default": default,
                }
            ],
            credentials=[_cred("sslAuth", show={"provideSslCertificates": [True]})],
        )

    install(entry(False))
    assert P.credential_required("n.ssl", 1) is False
    install(entry(True))
    assert P.credential_required("n.ssl", 1) is True


def test_conditions_it_cannot_decide_keep_the_credential_required(install):
    install(
        # gated by resource (not evaluated, per the documented limit)
        _node(
            "n.reddit", credentials=[_cred("redditApi", show={"resource": ["post"]})]
        ),
        # gated by a parameter the node has no default for
        _node("n.nodefault", credentials=[_cred("api", show={"mystery": ["x"]})]),
    )
    assert P.credential_required("n.reddit", 1) is True
    assert P.credential_required("n.nodefault", 1) is True


def test_version_gating_is_still_honoured(install):
    install(
        {
            "name": "n.versioned",
            "version": [1, 2],
            "defaultVersion": 2,
            "credentials": [_cred("newApi", show={"@version": [2]})],
        }
    )
    assert P.credential_required("n.versioned", 1) is False
    assert P.credential_required("n.versioned", 2) is True


def test_hide_conditions_are_respected(install):
    install(
        _node(
            "n.hide",
            properties=[_auth("none", ["none", "key"])],
            credentials=[_cred("api", hide={"authentication": ["none"]})],
        )
    )
    assert P.credential_required("n.hide", 1) is False


# ---------------- Part 2: the real nodes.json ----------------

real = pytest.mark.skipif(
    not P._NODES_JSON_PATH.exists(), reason="needs the real scripts/nodes.json"
)


def _versions(n):
    """`version` is a list for most nodes but a bare number for some."""
    v = n.get("version")
    return v if isinstance(v, list) else ([] if v is None else [v])


def _version_of(n):
    """The version to evaluate an entry at. Some entries have no
    defaultVersion at all, so fall back to the highest listed version (what
    scripts/check_credential_required.py does)."""
    d = n.get("defaultVersion")
    if isinstance(d, (int, float)):
        return d
    vs = [v for v in _versions(n) if isinstance(v, (int, float))]
    return max(vs) if vs else 1


def _current(name):
    """(name, version) for the node's current entry in nodes.json: prefer the
    entry whose own version list holds the version we'd evaluate it at."""
    same = [n for n in P._load_nodes() if n.get("name") == name]
    if not same:
        pytest.skip(f"{name} not in this nodes.json")
    for n in same:
        if _version_of(n) in _versions(n):
            return name, _version_of(n)
    return name, _version_of(same[0])


@real
@pytest.mark.parametrize(
    "name",
    [
        "n8n-nodes-base.gmail",
        "n8n-nodes-base.slack",
        "n8n-nodes-base.googleSheets",
        "n8n-nodes-base.airtable",
        "@n8n/n8n-nodes-langchain.lmChatGroq",
    ],
)
def test_real_services_that_need_a_credential_still_do(name):
    assert P.credential_required(*_current(name)) is True


@real
@pytest.mark.parametrize(
    "name",
    [
        "n8n-nodes-base.if",
        "n8n-nodes-base.set",
        "n8n-nodes-base.code",
        "n8n-nodes-base.graphql",
        "n8n-nodes-base.webhook",
        "n8n-nodes-base.httpRequest",
        "n8n-nodes-base.wait",
    ],
)
def test_real_nodes_that_run_without_a_credential_do_not_require_one(name):
    assert P.credential_required(*_current(name)) is False


@real
def test_never_under_demands_an_unconditional_required_credential():
    """The safety direction: a node with a required credential that has no
    displayOptions gate must always report True, whatever the rule does."""
    checked, seen = 0, set()
    for n in P._load_nodes():
        name, default = n.get("name"), _version_of(n)
        if not isinstance(name, str) or (name, default) in seen:
            continue
        seen.add((name, default))
        node_def = P._get_node_def(name, default)  # the entry the function will read
        if node_def is None:
            continue
        if any(
            c.get("required") is True and not c.get("displayOptions")
            for c in node_def.get("credentials") or []
        ):
            checked += 1
            assert P.credential_required(name, default) is True, name
    assert checked > 0
