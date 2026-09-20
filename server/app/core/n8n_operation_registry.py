"""
app/core/n8n_operation_registry.py

Loader + resolver for generated_registry.json, now built by the rewritten
scripts/generate_registry.py DIRECTLY from n8n's own nodes.json/
credentials.json (node -> credential join, not credential -> node; see
that script's module docstring for the full derivation and the real bugs
found/fixed while validating it against your actual data).

KEPT STABLE from the previous version of this module (workflow_generator.py
imports these and does not need to change how it calls them for any
non-hub service, which is every service currently reachable through the
Groq whitelist): get_service_entry, get_kind, list_resources,
resolve_operation, resolve_http_method, get_trigger_node, list_operations.

NEW: every one of those functions now accepts an optional `family=` kwarg,
default None, purely additive -- existing call sites are unaffected. It
only matters for the 25 real multi-node hub services (AWS, Cohere,
Anthropic, GitHub, Google, Microsoft, ...), where kind=="multi_node_hub"
and a single "service" actually spans several distinct underlying n8n
nodes (e.g. "aws" spans awsDynamoDb, awsCognito, awsLambda, ...). None of
these are in the current Groq services whitelist yet, so `family` is
unused today -- it exists so Phase 7 (the compiler) can pass it once
hub services are added to the whitelist, without another signature change.

KIND VALUES
------------------------------------------------------------------------------
    "action_node"       - real resource/operation (or flat `action`) menu,
                           dedicated standalone n8n node
    "ai_subnode"        - Chat Model / Embeddings / Reranker / Vector Store
                           sub-node under nodes-langchain; never a standalone
                           step, always wired under an AI Agent/Chain root
    "flat_params_node"  - dedicated node, no resource/operation dropdown at
                           all -- its raw parameter list is used as-is
    "trigger_only"      - only a trigger node, no standalone action node
    "http_only"         - no dedicated n8n node at all; reachable only via
                           the generic httpRequest node's "Predefined
                           Credential Type" picker (Datadog, Qualys, ...)
    "multi_node_hub"    - TOP-LEVEL kind for the 25 services that span
                           several real, differently-purposed nodes sharing
                           one credential. Not itself an operational kind --
                           call get_kind(service, family=<name>) or
                           list_families(service) to get a real per-node
                           kind from this level.

get_kind()/get_service_entry() return None for a service with no registry
entry at all -- callers should treat that the same as any other "unmapped"
case.

WHY resolve_operation NEVER PICKS A "PLAUSIBLE" MATCH ON AMBIGUITY
------------------------------------------------------------------------------
Unchanged reasoning from the previous version: a step shown as "resolved" in
the preview is what the user approves as-is -- a wrong silent guess there is
worse than an honest "needs review" gap, since it looks correct and only
breaks at deploy time. Exact match on the operation's own literal `value` is
tried before any keyword heuristic; ambiguity (more than one real candidate)
returns None rather than guessing, at every stage.
"""

import json
from functools import lru_cache
from pathlib import Path

_REGISTRY_PATH = (
    Path(__file__).resolve().parent.parent / "utils" / "generated_registry.json"
)

VERB_KEYWORDS = {
    "create": ["create", "add", "new", "post", "schedule", "upload", "insert"],
    "read": [
        "get",
        "read",
        "fetch",
        "retrieve",
        "info",
        "profile",
        "download",
        "select",
    ],
    "list": ["getall", "getmany", "list", "search"],
    "update": ["update", "edit", "modify", "set"],
    "delete": ["delete", "remove", "archive", "trash"],
    "send": ["send", "post", "publish", "notify"],
    "search": ["search", "find", "query", "lookup"],
    "generate": ["generate", "create"],
    "upload": ["upload", "add", "create"],
    "download": ["download", "get", "export"],
}

HTTP_METHOD_BY_VERB = {
    "create": "POST",
    "read": "GET",
    "list": "GET",
    "update": "PUT",
    "delete": "DELETE",
    "send": "POST",
    "search": "GET",
    "generate": "POST",
    "upload": "POST",
    "download": "GET",
}

# For ai_subnode families inside a multi_node_hub (Cohere's 4 candidates,
# etc.) -- maps a universal verb to which family-name substring it hints at.
# Used only by resolve_ai_subnode_family(); a step matching none of these
# falls back to the plain "lm"-prefixed (no embeddings/reranker) family if
# one exists, else returns None (needs review), same philosophy as
# resolve_operation.
AI_SUBNODE_HINTS = {
    "generate": "lmChat",
    "embed": "embeddings",
    "search": "reranker",
}


def resolve_http_method(universal_verb: str) -> str | None:
    return HTTP_METHOD_BY_VERB.get(universal_verb)


@lru_cache(maxsize=1)
def _load_registry() -> dict:
    with open(_REGISTRY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def reload_registry() -> None:
    """Call after regenerating generated_registry.json in the same process."""
    _load_registry.cache_clear()


def get_service_entry(service: str) -> dict | None:
    """Raw registry entry for a catalog service key (e.g. 'gmail', 'aws')."""
    reg = _load_registry()
    if service.startswith("_"):
        return None
    return reg.get(service)


def list_families(service: str) -> dict:
    """
    {} for a non-hub service. For a multi_node_hub service, the family-name
    -> per-family entry dict (each with its own "kind", "type", "typeVersion",
    and resources/operations where applicable) -- e.g. list_families("aws")
    returns {"awsDynamoDb": {...}, "awsCognito": {...}, ...}.
    """
    entry = get_service_entry(service)
    if not entry or entry.get("kind") != "multi_node_hub":
        return {}
    return entry.get("nodes", {}).get("families", {})


def _resolve_node_slot(service: str, family: str | None) -> dict | None:
    """
    Internal: returns the specific node-shaped dict to operate against --
    either entry["nodes"]["standalone"] for a normal service, or
    entry["nodes"]["families"][family] for a hub. Returns None if the
    service doesn't exist, or is a hub and no (valid) family was given.
    """
    entry = get_service_entry(service)
    if not entry:
        return None
    if entry.get("kind") == "multi_node_hub":
        if not family:
            return None
        return entry.get("nodes", {}).get("families", {}).get(family)
    return entry.get("nodes", {}).get("standalone")


def get_kind(service: str, family: str | None = None) -> str | None:
    entry = get_service_entry(service)
    if not entry:
        return None
    if entry.get("kind") == "multi_node_hub":
        if not family:
            return "multi_node_hub"  # caller must disambiguate via list_families()
        fam = entry.get("nodes", {}).get("families", {}).get(family)
        return fam["kind"] if fam else None
    return entry["kind"]


def get_trigger_node(service: str, family: str | None = None) -> dict | None:
    """
    {"type": "n8n-nodes-base.gmailTrigger", "typeVersion": ...} for a service
    with a real n8n trigger node, else None. For a non-hub service this
    checks nodes.trigger regardless of the service's own `kind` (a service
    can be action_node AND still have a trigger, e.g. gmail). For a hub,
    pass the specific family (e.g. "awsSnsTrigger" style) if it is itself a
    trigger_only family -- there's no separate combined trigger slot at the
    hub level, since each family is its own distinct node.
    """
    entry = get_service_entry(service)
    if not entry:
        return None
    if entry.get("kind") == "multi_node_hub":
        if not family:
            return None
        fam = entry.get("nodes", {}).get("families", {}).get(family)
        if fam and fam.get("kind") == "trigger_only":
            return {"type": fam["type"], "typeVersion": fam.get("typeVersion")}
        return None
    return entry.get("nodes", {}).get("trigger")


def list_resources(service: str, family: str | None = None) -> dict:
    """{'draft': 'Draft', ...} -- empty dict if the resolved node has no
    resource concept, isn't an action_node, or (hub) no valid family given."""
    node = _resolve_node_slot(service, family)
    if not node:
        return {}
    return node.get("resources", {}) or {}


def list_operations(
    service: str, resource: str | None = None, family: str | None = None
) -> list[dict]:
    """
    The REAL, complete operation list for this exact service/family (and
    resource, if it has resources) -- pulled straight from n8n's own
    nodes.json via the generator. Each dict is {"label", "value", "action"}.
    """
    node = _resolve_node_slot(service, family)
    if not node:
        return []
    if node.get("resources"):
        if not resource:
            return []
        return node.get("operationsByResource", {}).get(resource, [])
    return node.get("operationsNoResource", [])


def resolve_operation(
    service: str,
    universal_verb: str,
    resource: str | None = None,
    family: str | None = None,
) -> dict | None:
    """
    Best-effort, precision-first resolution of (service[, family], verb[,
    resource]) to a single real n8n operation dict. Same matching order as
    before -- exact `value` match, then scoped keyword match, HITL variants
    deprioritized -- stopping at the first stage yielding EXACTLY one
    candidate; ambiguity returns None (needs review), never a guess.
    """
    candidates = list_operations(service, resource=resource, family=family)
    if not candidates:
        return None

    exact = [op for op in candidates if op.get("value") == universal_verb]
    if len(exact) == 1:
        return exact[0]
    if len(exact) > 1:
        return None

    def _is_hitl_variant(op):
        text = f"{op.get('label','')} {op.get('action','')}".lower()
        return "wait for response" in text or "wait for approval" in text

    keywords = VERB_KEYWORDS.get(universal_verb, [universal_verb])
    matched = []
    for op in candidates:
        haystack = " ".join(
            filter(
                None, [op.get("value", ""), op.get("label", ""), op.get("action", "")]
            )
        ).lower()
        if any(kw in haystack for kw in keywords):
            matched.append(op)

    non_hitl = [op for op in matched if not _is_hitl_variant(op)]
    if len(non_hitl) == 1:
        return non_hitl[0]
    if len(non_hitl) == 0 and len(matched) == 1:
        return matched[0]
    return None


def resolve_ai_subnode_family(service: str, universal_verb: str) -> str | None:
    """
    For multi_node_hub AI providers whose families are ai_subnode variants
    (Cohere's lmChatCohere/embeddingsCohere/rerankerCohere/lmCohere, and
    similarly for OpenAI/Anthropic/HuggingFace/...): picks which family
    name matches the step's intent via AI_SUBNODE_HINTS, falling back to
    the plain "lm"-prefixed family (no embeddings/reranker qualifier) if
    the verb doesn't hint at anything specific, and returning None (needs
    review) only if neither exists. This is the one place this module
    intentionally has a fallback instead of returning None on a near-miss --
    an AI provider with no verb match still has ONE sensible default (the
    base chat/completion node), unlike a genuinely ambiguous CRUD operation.
    """
    families = list_families(service)
    ai_families = {
        name: f for name, f in families.items() if f.get("kind") == "ai_subnode"
    }
    if not ai_families:
        return None

    hint = AI_SUBNODE_HINTS.get(universal_verb)
    if hint:
        match = next(
            (name for name in ai_families if hint.lower() in name.lower()), None
        )
        if match:
            return match

    # fall back to the plainest variant: shortest name with no
    # embeddings/reranker qualifier
    plain = [
        n for n in ai_families if "embed" not in n.lower() and "rerank" not in n.lower()
    ]
    if plain:
        return sorted(plain, key=len)[0]
    return None
