# app/utils/node_registry.py
"""
Node Registry — maps (service, generic IR verb) -> n8n node target.

Why this exists:
The Groq system prompt (workflow_generator.py) only ever emits one of ten
universal verbs per step: create, read, update, delete, list, send, search,
generate, upload, download. It deliberately knows nothing about how any
individual service implements that verb in n8n — that specificity used to
live in the prompt as a per-category operations table, which broke the first
time a service (Notion) didn't fit its assigned category, and would keep
breaking on every future new service.

That specificity now lives here instead, as a plain lookup table. Adding a
new service to the platform means adding a row here — never touching the
Groq prompt, and never redeploying the LLM-generation path at all.

Status: this is a data structure only. The compiler that consumes it
(preview_json -> n8n-executable workflow JSON) is not built yet, per
Project Context §3/§9 ("Workflow compiler — Not started"). This file exists
so that work isn't starting from zero, and so the (service, verb) contract
this registry expects is settled before compiler work begins.

Each entry maps a service to the n8n node type it compiles to, plus a
per-verb table of (resource, operation) pairs as n8n itself names them.
A missing verb for a given service means that verb is not supported for
that service — the compiler should raise a clear "unsupported operation
for this service" error rather than guessing.
"""

from typing import TypedDict


class N8nTarget(TypedDict):
    resource: str
    operation: str


class NodeRegistryEntry(TypedDict):
    n8n_node_type: str
    operations: dict[str, N8nTarget]  # keyed by universal verb


NODE_REGISTRY: dict[str, NodeRegistryEntry] = {

    # --- AI --------------------------------------------------------------
    # Groq is not a native n8n node (see Report Problem 3). Routed through
    # the generic HTTP Request node, hand-configured to call Groq's
    # OpenAI-compatible chat completions endpoint. "resource"/"operation"
    # are not meaningful for HTTP Request the way they are for typed nodes;
    # left as fixed placeholders so downstream code has a consistent shape
    # to read regardless of node type.
    "groq": {
        "n8n_node_type": "n8n-nodes-base.httpRequest",
        "operations": {
            "generate": {"resource": "http", "operation": "post"},
        },
    },

    # --- Communication -----------------------------------------------------
    "gmail": {
        "n8n_node_type": "n8n-nodes-base.gmail",
        "operations": {
            "send":   {"resource": "message", "operation": "send"},
            "read":   {"resource": "message", "operation": "get"},
            "search": {"resource": "message", "operation": "getAll"},
        },
    },
    "slack": {
        "n8n_node_type": "n8n-nodes-base.slack",
        "operations": {
            "send":   {"resource": "message", "operation": "post"},
            "read":   {"resource": "message", "operation": "get"},
            "search": {"resource": "message", "operation": "search"},
        },
    },

    # --- Productivity --------------------------------------------------
    "google_calendar": {
        "n8n_node_type": "n8n-nodes-base.googleCalendar",
        "operations": {
            "create": {"resource": "event", "operation": "create"},
            "read":   {"resource": "event", "operation": "get"},
            "update": {"resource": "event", "operation": "update"},
            "delete": {"resource": "event", "operation": "delete"},
            "list":   {"resource": "event", "operation": "getAll"},
        },
    },

    # --- Documents (Notion moved here from Productivity — its primary
    # object model is a page/document, not an event or task; see
    # inconsistency discussion, Notion mis-categorization) ------------------
    "notion": {
        "n8n_node_type": "n8n-nodes-base.notion",
        "operations": {
            "create": {"resource": "page", "operation": "create"},
            "read":   {"resource": "page", "operation": "get"},
            "update": {"resource": "page", "operation": "update"},
            "list":   {"resource": "databasePage", "operation": "getAll"},
            "search": {"resource": "database", "operation": "search"},
        },
    },
    "google_sheets": {
        "n8n_node_type": "n8n-nodes-base.googleSheets",
        "operations": {
            "create": {"resource": "sheet", "operation": "create"},
            "read":   {"resource": "sheet", "operation": "read"},
            "update": {"resource": "sheet", "operation": "update"},
        },
    },

    # --- Fallback ------------------------------------------------------
    # Per Report Problem 7: "http"/"webhook" always emit the generic node;
    # display_name (carried on required_integrations, not here) is surfaced
    # only in the node's name/label, never used for node selection.
    "http": {
        "n8n_node_type": "n8n-nodes-base.httpRequest",
        "operations": {verb: {"resource": "http", "operation": "request"}
                        for verb in ("create", "read", "update", "delete",
                                     "list", "send", "search", "generate",
                                     "upload", "download")},
    },
    "webhook": {
        "n8n_node_type": "n8n-nodes-base.webhook",
        "operations": {verb: {"resource": "webhook", "operation": "receive"}
                        for verb in ("create", "read", "update", "delete",
                                     "list", "send", "search", "generate",
                                     "upload", "download")},
    },

    # NOTE: this table currently covers only the services exercised so far
    # in testing (groq, gmail, slack, google_calendar, notion, google_sheets)
    # plus the http/webhook fallback. The remaining ~88 services in the
    # whitelist (app/core/integration_catalog.py) still need rows added
    # before the compiler can handle workflows that use them. Extending
    # this table is now the ONLY place new-service support needs to be
    # added — the Groq prompt and IR schema do not change.
}


def resolve_node_target(service: str, verb: str) -> N8nTarget:
    """
    Looks up the n8n (resource, operation) pair for a given service + verb.
    Raises KeyError with a clear message if the service has no registry
    entry, or the entry doesn't support that verb — callers should treat
    both as a compile-time error, not something to guess around.
    """
    entry = NODE_REGISTRY.get(service)
    if entry is None:
        raise KeyError(f"No Node Registry entry for service '{service}'")

    target = entry["operations"].get(verb)
    if target is None:
        raise KeyError(
            f"Service '{service}' has no '{verb}' operation in the Node Registry "
            f"(supported: {sorted(entry['operations'].keys())})"
        )
    return target