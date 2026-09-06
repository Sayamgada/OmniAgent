"""
app/core/node_registry.py

Placement note: this module lives in app/core (alongside integration_catalog.py,
since it's the same kind of thing - a static, hand-curated-adjacent reference
table the rest of the app reads from). Its data file, node_registry.json,
lives in app/util/ instead of app/core/ - it's a large (~800KB) generated
artifact, not hand-maintained source, so keeping it out of core/ matches
the existing separation between code (core/) and generated/derived assets.

    app/
      core/
        node_registry.py        <- this file (loader + resolver logic)
        integration_catalog.py
      util/
        node_registry.json      <- generated data, regenerate via the
                                     offline script (see REGENERATING below)

HOW SERVICES WERE MAPPED (see integration_catalog.py's 386-service catalog)
------------------------------------------------------------------------------
integration_catalog.py's service keys (e.g. "twitter", "you_tube", "linked_in")
don't correspond 1:1 to n8n node folder names, and can't be hand-mapped at this
scale. The one field guaranteed to match n8n source exactly is
`n8n_credential_type` - every n8n node declares which credential name(s) it
accepts via a `credentials: [{name: '...'}]` block. So:

    1. Pull every n8n_credential_type out of INTEGRATION_CATALOG.
    2. grep n8n's full source tree (nodes-base + @n8n/nodes-langchain) for
       `name: '<credential_type>'` to find which node folder(s) declare it.
    3. Parse each matched node folder's resource/operation option lists via
       the TypeScript compiler API (not regex - too structurally varied).
    4. Join back onto the catalog's service keys.

All 386 services classified into exactly one `kind`:

    "action_node"   (277) - real resource/operation menu, parseable
    "ai_subnode"    (36)  - Chat Model/Vector Store/Tool sub-node under
                            nodes-langchain; never a standalone step, always
                            wired under an AI Agent/Chain root node
    "http_only"     (41)  - credential exists, no node found; only reachable
                            via a generic HTTP Request node
    "trigger_only_or_unparsed" (32) - node found, zero operations extracted.
                            Mostly genuine trigger-only nodes, but a few use
                            a legacy `name:'action'` property this version of
                            the extractor doesn't parse (FileMaker confirmed
                            as one). Treat as "needs a manual look".

REGENERATING node_registry.json
------------------------------------------------------------------------------
Source of truth is n8n's GitHub repo:

    git clone --depth 1 --filter=blob:none --sparse https://github.com/n8n-io/n8n.git
    cd n8n && git sparse-checkout set \
        packages/nodes-base/nodes packages/nodes-base/credentials \
        packages/@n8n/nodes-langchain/nodes

Then re-run the credential-type grep + TS-compiler extraction pipeline
against the current integration_catalog.py. Do this whenever
integration_catalog.py's n8n_credential_type values change, or n8n releases
add/rename node operations.
"""

import json
import os
from functools import lru_cache
from pathlib import Path

_REGISTRY_PATH = (
    Path(__file__).resolve().parent.parent / "utils" / "n8n_operation_registry.json"
)
print(_REGISTRY_PATH)

# Universal verb -> keyword(s) likely to appear in the matching real n8n
# operation's label/action text. A deterministic heuristic to narrow a
# resource's operation list to plausible candidates - not a guarantee.
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

# Universal verb -> HTTP method, for services classified as "generic_http"
# (currently just "http" - the generic HTTP Request node has no resource/
# operation menu at all, confirmed against n8n's own docs: it's just a
# Method dropdown with these exact literal values). Standard REST convention,
# not an n8n-specific guess - applies to any future "generic_http" entry.
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


def resolve_http_method(universal_verb: str) -> str | None:
    """Maps a universal verb to an HTTP method for "generic_http" kind
    services. Returns None for verbs with no sensible REST mapping (caller
    should treat that as "needs a human to pick a method")."""
    return HTTP_METHOD_BY_VERB.get(universal_verb)


@lru_cache(maxsize=1)
def _load_registry() -> dict:
    with open(_REGISTRY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_service_entry(service: str) -> dict | None:
    """Raw registry entry for a catalog service key (e.g. 'gmail', 'twitter', 'you_tube')."""
    return _load_registry().get(service)


def get_kind(service: str) -> str | None:
    entry = get_service_entry(service)
    return entry["kind"] if entry else None


def list_resources(service: str) -> dict:
    """{'draft': 'Draft', 'message': 'Message', ...} - empty dict if service has no resource concept."""
    entry = get_service_entry(service)
    if not entry or entry["kind"] != "action_node":
        return {}
    return entry.get("resources", {})


def resolve_operation(
    service: str, universal_verb: str, resource: str | None = None
) -> dict | None:
    """
    Best-effort resolution of (service, universal_verb[, resource]) -> a single
    real n8n operation dict {"label", "value", "action", "description"}.

    NOT used by the preview-generation path today - this exists for the
    workflow compiler (n8n-ready JSON), which is explicitly deferred. It's
    included here now so the registry's shape is validated end-to-end, but
    nothing in workflow_generator.py calls this yet.

    Returns None (not a raised error) on no confident match.
    """
    entry = get_service_entry(service)
    if not entry or entry["kind"] != "action_node":
        return None

    keywords = VERB_KEYWORDS.get(universal_verb, [universal_verb])

    if entry.get("resources"):
        # This service genuinely has distinct resources (e.g. gmail's
        # draft/label/message/thread) - the caller must supply one, and it's
        # looked up literally, since these resource keys are real and stable.
        if not resource:
            return None  # ambiguous - caller must supply a resource
        candidates = entry.get("operationsByResource", {}).get(resource, [])
    else:
        # Empty "resources" IS the registry's signal that this service has no
        # meaningful resource concept for a caller to target - regardless of
        # whatever "target" Groq generated (it has no way to know internal
        # registry key names like postgres's "database"). Ignoring `resource`
        # here is deliberate: trusting it was the confirmed bug that made
        # postgres/mysql/etc. only resolve when target happened to be "".
        candidates = entry.get("operationsNoResource", [])

    for op in candidates:
        haystack = " ".join(
            filter(
                None, [op.get("value", ""), op.get("label", ""), op.get("action", "")]
            )
        ).lower()
        if any(kw in haystack for kw in keywords):
            return op
    return None
