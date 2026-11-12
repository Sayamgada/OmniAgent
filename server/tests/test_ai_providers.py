"""
tests/test_ai_providers.py

core/ai_providers.py is hand-owned, so every entry is cross-checked against
the registry, the integration catalog and scripts/nodes.json (n8n's own node
definitions). If n8n is upgraded and a provider's node, credential, model
parameter name/shape or default changes, these tests fail here instead of at
deploy time.
"""

import json
from pathlib import Path

import pytest

from app.core import ai_providers as ap
from app.core.integration_catalog import INTEGRATION_CATALOG
from app.core.n8n_operation_registry import get_chat_model_node

NODES_JSON = Path(__file__).resolve().parents[1] / "scripts" / "nodes.json"
D4_KEYS = ("groq", "openai", "anthropic", "gemini", "mistral", "openrouter")

# Seeded default intentionally differs from n8n's own default for these
# (groq: n8n still defaults to llama3-8b-8192, which Groq has shut down).
DEFAULT_DIFFERS_FROM_NODES_JSON = {"groq"}

_SHAPE_BY_PARAM_TYPE = {
    "options": ap.SHAPE_STRING,
    "string": ap.SHAPE_STRING,
    "resourceLocator": ap.SHAPE_RESOURCE_LOCATOR,
}


# ---------------------------------------------------------------- module only


def test_catalog_has_exactly_the_d4_providers_in_order():
    assert tuple(p.key for p in ap.list_ai_providers()) == D4_KEYS


@pytest.mark.parametrize("key", D4_KEYS)
def test_default_is_in_curated_list_and_custom_ids_allowed(key):
    p = ap.get_ai_provider(key)
    assert p.default_model in p.models
    assert p.allow_custom_model is True


def test_groq_default_is_not_the_shut_down_llama():
    assert ap.get_ai_provider("groq").default_model != "llama3-8b-8192"


def test_get_ai_provider_unknown_returns_none():
    assert ap.get_ai_provider("cohere") is None


def test_full_model_id_adds_gemini_prefix_once():
    assert ap.full_model_id("gemini", "gemini-2.5-flash") == "models/gemini-2.5-flash"
    assert (
        ap.full_model_id("gemini", "models/gemini-2.5-flash")
        == "models/gemini-2.5-flash"
    )


def test_full_model_id_leaves_other_providers_unchanged():
    assert ap.full_model_id("groq", "openai/gpt-oss-20b") == "openai/gpt-oss-20b"
    assert ap.full_model_id("nope", "x") == "x"


# ------------------------------------------- against registry/catalog/nodes.json


@pytest.fixture(scope="module")
def nodes_by_name():
    if not NODES_JSON.exists():
        pytest.skip(f"{NODES_JSON} not found")
    with open(NODES_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    nodes = list(data.values()) if isinstance(data, dict) else data
    out = {}
    for n in nodes:
        out.setdefault(n.get("name"), []).append(n)
    return out


def _versions(node):
    v = node.get("version")
    return [float(x) for x in v] if isinstance(v, list) else [float(v)]


def _entry_for(nodes_by_name, node_type, type_version):
    """The nodes.json entry whose version list contains type_version (some
    nodes appear more than once with different version groups)."""
    for n in nodes_by_name.get(node_type, []):
        if float(type_version) in _versions(n):
            return n
    return None


def _cond_matches(cond, tv):
    if isinstance(cond, dict) and "_cnd" in cond:
        for op, val in cond["_cnd"].items():
            if op == "eq" and not tv == val:
                return False
            if op == "not" and not tv != val:
                return False
            if op == "gte" and not tv >= val:
                return False
            if op == "lte" and not tv <= val:
                return False
            if op == "gt" and not tv > val:
                return False
            if op == "lt" and not tv < val:
                return False
            if op not in ("eq", "not", "gte", "lte", "gt", "lt"):
                raise AssertionError(f"unhandled displayOptions operator: {op}")
        return True
    return float(cond) == float(tv)


def _visible(param, tv):
    """Is this property shown at typeVersion tv? Only @version gating is
    understood; anything else fails loudly rather than guessing."""
    opts = param.get("displayOptions") or {}
    assert set(opts) <= {"show", "hide"}, f"unexpected displayOptions: {opts}"
    for key, conds in (opts.get("show") or {}).items():
        assert key == "@version", f"model param gated on {key}, not @version"
        if not any(_cond_matches(c, tv) for c in conds):
            return False
    for key, conds in (opts.get("hide") or {}).items():
        assert key == "@version", f"model param gated on {key}, not @version"
        if any(_cond_matches(c, tv) for c in conds):
            return False
    return True


def _model_params_at(entry, tv):
    return [
        p
        for p in entry.get("properties", [])
        if p.get("name") in ("model", "modelName") and _visible(p, tv)
    ]


@pytest.fixture
def resolved(nodes_by_name):
    def _resolve(key):
        provider = ap.get_ai_provider(key)
        node = get_chat_model_node(key)
        assert node is not None, f"{key}: registry has no chat-model node"
        entry = _entry_for(nodes_by_name, node["type"], node["typeVersion"])
        assert (
            entry is not None
        ), f"{key}: {node['type']} v{node['typeVersion']} not in nodes.json"
        return provider, node, entry

    return _resolve


@pytest.mark.parametrize("key", D4_KEYS)
def test_provider_is_in_integration_catalog(key):
    assert key in INTEGRATION_CATALOG, f"{key} missing from INTEGRATION_CATALOG"


@pytest.mark.parametrize("key", D4_KEYS)
def test_chat_node_exists_in_nodes_json_at_registry_version(key, resolved):
    resolved(key)  # asserts inside


@pytest.mark.parametrize("key", D4_KEYS)
def test_node_credential_is_one_the_catalog_offers(key, resolved):
    _, _, entry = resolved(key)
    node_creds = {c.get("name") for c in (entry.get("credentials") or [])}
    catalog_creds = {
        o.get("n8n_credential_type")
        for o in INTEGRATION_CATALOG[key].get("auth_options", [])
    }
    assert (
        node_creds & catalog_creds
    ), f"{key}: node wants {sorted(node_creds)}, catalog offers {sorted(catalog_creds)}"


@pytest.mark.parametrize("key", D4_KEYS)
def test_model_param_name_and_shape_match_node_at_emitted_version(key, resolved):
    provider, node, entry = resolved(key)
    visible = _model_params_at(entry, node["typeVersion"])
    assert len(visible) == 1, (
        f"{key}: expected exactly one visible model param at "
        f"v{node['typeVersion']}, found {len(visible)}"
    )
    param = visible[0]
    assert param["name"] == provider.model_param.name
    assert _SHAPE_BY_PARAM_TYPE[param["type"]] == provider.model_param.shape


@pytest.mark.parametrize(
    "key", [k for k in D4_KEYS if k not in DEFAULT_DIFFERS_FROM_NODES_JSON]
)
def test_default_model_matches_n8n_default_at_emitted_version(key, resolved):
    provider, node, entry = resolved(key)
    param = _model_params_at(entry, node["typeVersion"])[0]
    default = param.get("default")
    if isinstance(default, dict):  # resource locator
        default = default.get("value")
    prefix = provider.model_param.prefix
    if prefix and isinstance(default, str) and default.startswith(prefix):
        default = default[len(prefix) :]
    assert default == provider.default_model
