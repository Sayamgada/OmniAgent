"""
Step 2 — Node instantiation (realigned against the real, ENRICHED
preview_json — see omniagent_compiler_realignment_plan.md).

What changed from the first draft, now that workflow_generator.py's
_enrich_with_real_operations/_enrich_trigger are confirmed to run
server-side before the compiler ever sees a step:

1. No more verb-guessing. Groq already emits a canonical universal verb
   directly as step.operation (10-verb IR model), and for action_node
   steps the server has ALREADY resolved it against the real registry
   (step.n8n_operation). guess_universal_verb()/VERB_KEYWORDS are gone —
   there is nothing left to guess from free text, because there is no
   free text (no `action` field anymore).

2. Branch on step.n8n_resolution_kind FIRST (what the server already
   decided), falling back to get_service_entry()/entry["kind"] only for
   things the enrichment doesn't carry: node type/version for
   action_node, typeVersion + credential for ai_subnode's chat-model,
   and the legacy multi_node_hub path (per the plan's open question —
   the enrichment doesn't appear to touch multi_node_hub today, so that
   branch is kept as a fallback rather than assumed dead).

3. The trigger is a synthetic step 0 (loader.py), already resolved
   server-side to a real node type via step.n8n_trigger_node — this is
   resolved directly, never through get_service_entry().

4. An ai_subnode step now produces an "agent_root" ResolvedNode (the
   thing that actually sits in the main chain and takes
   step.instructions as its prompt), with the chat-model node attached
   as resolved.subnodes[0] — NOT a bare "ai_subnode" ResolvedNode wired
   via depends_on to some other "head" step, which was the pre-
   realignment (and architecturally backwards) model.
"""

from __future__ import annotations

from typing import Optional

from app.core.n8n_operation_registry import (
    get_service_entry,
    list_families,
    resolve_ai_subnode_family,
)
from app.core.integration_catalog import get_auth_option

from .models import ResolvedNode, Step

_HTTP_REQUEST_TYPE = "n8n-nodes-base.httpRequest"
_HTTP_REQUEST_VERSION = (
    4.2  # fallback only, used when enrichment gives no n8n_http_node
)

# Confirmed empirically against a live nodes.json (realignment plan §1d/§4):
# Agent root has version list [3, 3.1], defaultVersion 3.1.
_AGENT_ROOT_TYPE_VERSION = 3.1

# Per-provider chat-model typeVersion. Only lmChatGroq is confirmed
# (version 1, scalar — no defaultVersion key). Any provider added to
# workflow_generator.py's _AI_SUBNODE_CHAT_MODEL_TYPES needs its own
# entry here, confirmed the same empirical way before trusting it
# (realignment plan §4, open question 2).
_CHAT_MODEL_TYPE_VERSIONS: dict[str, float] = {
    "@n8n/n8n-nodes-langchain.lmChatGroq": 1,
}


def _unique_name(base: str, used: set[str]) -> str:
    name = base
    i = 2
    while name in used:
        name = f"{base} {i}"
        i += 1
    used.add(name)
    return name


def _credential_type_for(service: Optional[str]) -> Optional[str]:
    if not service:
        return None
    opt = get_auth_option(service, None)  # None -> entry's default_option
    return opt["n8n_credential_type"] if opt else None


def _display_name_for(service: str) -> str:
    entry = get_service_entry(service)
    return entry.get("display_name", service) if entry else service


def _instantiate_trigger(step: Step, used_names: set[str]) -> ResolvedNode:
    """Synthetic step 0, already resolved server-side (_enrich_trigger)."""
    if step.n8n_resolution_kind == "action_node" and step.n8n_trigger_node:
        resolved = ResolvedNode(step=step.step, kind="action_node")
        resolved.node_type = step.n8n_trigger_node.get("type")
        resolved.type_version = step.n8n_trigger_node.get("typeVersion")
        resolved.n8n_credential_type = _credential_type_for(step.service)
        label = _display_name_for(step.service) if step.service else "Trigger"
        resolved.name = _unique_name(label, used_names)
        return resolved

    # n8n_trigger_resolved was false server-side -- genuinely unresolvable,
    # not something to guess at compiler time either.
    resolved = ResolvedNode(step=step.step, kind="no_operation_match")
    resolved.name = _unique_name("Trigger", used_names)
    return resolved


def _instantiate_agent(step: Step, used_names: set[str]) -> ResolvedNode:
    """
    ai_subnode step -> the Agent root node (main-chain position) plus its
    chat-model subnode, per step.n8n_subnode (already resolved server-side).
    """
    subnode_info = step.n8n_subnode or {}
    root_type = subnode_info.get("root_node_type")
    chat_model_type = subnode_info.get("chat_model_node_type")
    connection_type = subnode_info.get("connection_type", "ai_languageModel")

    if not root_type or not chat_model_type:
        resolved = ResolvedNode(step=step.step, kind="no_operation_match")
        resolved.name = _unique_name(step.service, used_names)
        return resolved

    agent = ResolvedNode(step=step.step, kind="agent_root")
    agent.node_type = root_type
    agent.type_version = _AGENT_ROOT_TYPE_VERSION
    agent.name = _unique_name(f"{step.service} (AI Agent)", used_names)

    chat_model = ResolvedNode(step=step.step, kind="ai_subnode")
    chat_model.node_type = chat_model_type
    chat_model.type_version = _CHAT_MODEL_TYPE_VERSIONS.get(chat_model_type)
    chat_model.ai_connection_type = connection_type
    chat_model.n8n_credential_type = _credential_type_for(step.service)
    chat_model.name = _unique_name(f"{step.service} (Chat Model)", used_names)

    agent.subnodes = [chat_model]
    return agent


def _instantiate_http(step: Step, used_names: set[str]) -> ResolvedNode:
    """http_only/flat_params_node step -- server already resolved the node."""
    http_info = step.n8n_http_node or {}
    resolved = ResolvedNode(step=step.step, kind="http_only")
    resolved.node_type = http_info.get("node_type", _HTTP_REQUEST_TYPE)
    resolved.type_version = http_info.get("typeVersion", _HTTP_REQUEST_VERSION)
    resolved.n8n_credential_type = _credential_type_for(step.service)
    resolved.name = _unique_name(_display_name_for(step.service), used_names)
    return resolved


def _instantiate_action(
    step: Step, used_names: set[str], ai_tool_steps: set
) -> ResolvedNode:
    """
    action_node step -- server already resolved the operation
    (step.n8n_operation); this still needs the node type/version + the
    standalone-vs-tool variant choice, which the enrichment doesn't carry.
    """
    entry = get_service_entry(step.service)
    if entry is None:
        resolved = ResolvedNode(step=step.step, kind="no_operation_match")
        resolved.name = _unique_name(step.service, used_names)
        return resolved

    nodes = entry.get("nodes", {})
    # "tool" means an AI step calls THIS step as a tool mid-reasoning --
    # i.e. this step's number appears in an ai_subnode step's OWN
    # depends_on. NOT "this step depends on an ai_subnode step", which is
    # just the ordinary downstream main chain (e.g. "send the drafted
    # reply") and must stay "standalone".
    wants_tool = step.step in ai_tool_steps
    variant_key = "tool" if (wants_tool and "tool" in nodes) else "standalone"
    variant = nodes.get(variant_key, nodes.get("standalone"))
    if variant is None:
        resolved = ResolvedNode(step=step.step, kind="no_operation_match")
        resolved.name = _unique_name(step.service, used_names)
        return resolved

    resolved = ResolvedNode(step=step.step, kind="action_node")
    resolved.node_type = variant["type"]
    resolved.type_version = variant["typeVersion"]
    resolved.is_tool_variant = variant is nodes.get("tool")
    resolved.n8n_credential_type = _credential_type_for(step.service)
    resolved.name = _unique_name(_display_name_for(step.service), used_names)

    # Keep step.operation in sync with the server-confirmed n8n operation
    # value (may differ in wording from the canonical verb Groq wrote,
    # e.g. a verb that resolved to "getAll") -- downstream param_schema
    # lookups need the real n8n operation value.
    if step.n8n_operation and step.n8n_operation.get("value"):
        step.operation = step.n8n_operation["value"]

    return resolved


def _instantiate_multi_node_hub(step: Step, used_names: set[str]) -> ResolvedNode:
    """
    Legacy fallback path. Per the realignment plan's open question #1: it's
    unconfirmed whether Groq's prompt reaches multi_node_hub services at
    all today (it may currently only ever emit "groq", which resolves as
    ai_subnode, not multi_node_hub) -- kept as-is rather than assumed dead,
    but no longer the primary path for anything the enrichment covers.
    """
    families = list_families(step.service)
    ai_families = {n: f for n, f in families.items() if f.get("kind") == "ai_subnode"}
    family_name = None
    if ai_families:
        verb = step.operation or "generate"  # already canonical, no guessing needed
        family_name = resolve_ai_subnode_family(step.service, verb)

    if family_name is None:
        # Non-AI hub disambiguation (e.g. AWS's ~23 product nodes) isn't
        # solved generically -- deliberate stop, not a guess.
        resolved = ResolvedNode(step=step.step, kind="no_operation_match")
        resolved.candidates = [{"family": name} for name in families]
        resolved.name = _unique_name(step.service, used_names)
        return resolved

    family = families[family_name]
    resolved = ResolvedNode(step=step.step, kind="ai_subnode")
    resolved.node_type = family["type"]
    resolved.type_version = family["typeVersion"]
    resolved.ai_connection_type = "ai_languageModel"
    resolved.n8n_credential_type = _credential_type_for(step.service)
    resolved.name = _unique_name(_display_name_for(step.service), used_names)
    return resolved


def instantiate_step(
    step: Step, used_names: set[str], ai_tool_steps: set
) -> ResolvedNode:
    if step.is_trigger:
        return _instantiate_trigger(step, used_names)

    kind = step.n8n_resolution_kind

    if kind == "ai_subnode" and step.n8n_subnode:
        return _instantiate_agent(step, used_names)

    if kind in ("http_only", "flat_params_node") and step.n8n_http_node:
        return _instantiate_http(step, used_names)

    if kind == "action_node":
        return _instantiate_action(step, used_names, ai_tool_steps)

    # Enrichment didn't resolve this step (no_operation_match/unmapped/
    # unsupported_kind), or didn't cover it (multi_node_hub) -- fall back
    # to the registry entry's own kind rather than giving up immediately.
    entry = get_service_entry(step.service) if step.service else None
    entry_kind = entry.get("kind") if entry else None

    if entry_kind == "multi_node_hub":
        return _instantiate_multi_node_hub(step, used_names)

    resolved = ResolvedNode(step=step.step, kind="no_operation_match")
    if entry and step.target:
        from app.core.n8n_operation_registry import list_operations

        resolved.candidates = list_operations(step.service, resource=step.target)
    resolved.name = _unique_name(step.service or "unknown", used_names)
    return resolved
