"""
Step 2 — Node instantiation (rewritten against the real registry).

Imports directly from app.core.n8n_operation_registry and
app.core.integration_catalog -- no local registry re-implementation.
Two things this version corrects vs. the first draft, found by reading
the real modules instead of guessing:

1. resolve_operation() takes a `universal_verb` (one of the
   VERB_KEYWORDS keys: create/read/list/update/delete/send/search/
   generate/upload/download), not free-text action matching. Groq's
   step.action is free text ("Send a message"), so this module maps it
   to a universal_verb first via the SAME VERB_KEYWORDS table
   n8n_operation_registry.py itself uses (imported, not duplicated) --
   if that mapping is ambiguous or empty, the step is genuinely
   unresolvable and goes to no_operation_match rather than guessing.
   NOTE: if workflow_generator.py already asks Groq for a canonical verb
   directly (worth checking), swap this heuristic for that field instead
   of guessing from `action` text -- this is a bridge until confirmed.

2. Credential fields (auth_options[].fields) describe the CREDENTIAL
   CONNECT FORM (OAuth client id, API key, etc.), not a node's per-
   operation action parameters. There is no per-operation parameter
   schema anywhere in generated_registry.json -- it was never captured
   by the generator (only node type/version + the resource/operation
   MENU). So this module does not attempt to fill action parameters at
   all; only `resource`/`operation` are set. Real parameter collection
   will need nodes.json's `properties` arrays directly, later.
"""

from __future__ import annotations

from typing import Optional

from app.core.n8n_operation_registry import (
    VERB_KEYWORDS,
    get_service_entry,
    get_trigger_node,
    list_families,
    resolve_ai_subnode_family,
    resolve_operation,
)
from app.core.integration_catalog import get_auth_option

from .models import ResolvedNode, Step

_HTTP_REQUEST_TYPE = "n8n-nodes-base.httpRequest"
_HTTP_REQUEST_VERSION = 4.2  # not in the registry (http_only has no `nodes` key);
# confirm this against your running n8n's nodes.json.


def guess_universal_verb(action_text: str) -> Optional[str]:
    """
    Bridge until confirmed whether workflow_generator.py already emits a
    canonical verb. Matches VERB_KEYWORDS substrings against the action
    text; returns the verb only on a SINGLE unambiguous match, same
    ambiguity-averse philosophy as resolve_operation() itself.
    """
    text = action_text.lower()
    matches = [v for v, kws in VERB_KEYWORDS.items() if any(kw in text for kw in kws)]
    return matches[0] if len(matches) == 1 else None


def _unique_name(base: str, used: set[str]) -> str:
    name = base
    i = 2
    while name in used:
        name = f"{base} {i}"
        i += 1
    used.add(name)
    return name


def _credential_type_for(service: str, family: Optional[str] = None) -> Optional[str]:
    opt = get_auth_option(service, None)  # None -> entry's default_option
    return opt["n8n_credential_type"] if opt else None


def instantiate_step(
    step: Step, used_names: set[str], ai_head_services: set[str]
) -> ResolvedNode:
    entry = get_service_entry(step.service)

    if entry is None:
        resolved = ResolvedNode(step=step.step, kind="http_only")
        resolved.node_type = _HTTP_REQUEST_TYPE
        resolved.type_version = _HTTP_REQUEST_VERSION
        resolved.name = _unique_name(f"{step.service} (HTTP)", used_names)
        return resolved

    kind = entry.get("kind")
    nodes = entry.get("nodes", {})

    if kind == "http_only":
        resolved = ResolvedNode(step=step.step, kind="http_only")
        resolved.node_type = _HTTP_REQUEST_TYPE
        resolved.type_version = _HTTP_REQUEST_VERSION
        resolved.n8n_credential_type = _credential_type_for(step.service)
        resolved.name = _unique_name(
            entry.get("display_name", step.service), used_names
        )
        return resolved

    if kind == "trigger_only":
        if not step.is_trigger or "trigger" not in nodes:
            resolved = ResolvedNode(step=step.step, kind="no_operation_match")
            resolved.candidates = []
            resolved.name = _unique_name(step.service, used_names)
            return resolved
        resolved = ResolvedNode(step=step.step, kind="action_node")
        resolved.node_type = nodes["trigger"]["type"]
        resolved.type_version = nodes["trigger"]["typeVersion"]
        resolved.n8n_credential_type = _credential_type_for(step.service)
        resolved.name = _unique_name(
            entry.get("display_name", step.service), used_names
        )
        return resolved

    if kind == "flat_params_node":
        variant_key = (
            "trigger" if (step.is_trigger and "trigger" in nodes) else "standalone"
        )
        variant = nodes.get(variant_key)
        if variant is None:
            resolved = ResolvedNode(step=step.step, kind="no_operation_match")
            resolved.name = _unique_name(step.service, used_names)
            return resolved
        resolved = ResolvedNode(step=step.step, kind="action_node")
        resolved.node_type = variant["type"]
        resolved.type_version = variant["typeVersion"]
        resolved.n8n_credential_type = _credential_type_for(step.service)
        resolved.name = _unique_name(
            entry.get("display_name", step.service), used_names
        )
        return resolved

    if kind == "action_node":
        if step.is_trigger and "trigger" in nodes:
            variant_entry = nodes["trigger"]
        else:
            wants_tool = any(dep in ai_head_services for dep in step.depends_on)
            variant_key = "tool" if (wants_tool and "tool" in nodes) else "standalone"
            variant_entry = nodes.get(variant_key, nodes.get("standalone"))

        resolved = ResolvedNode(step=step.step, kind="action_node")
        resolved.node_type = variant_entry["type"]
        resolved.type_version = variant_entry["typeVersion"]
        resolved.is_tool_variant = not step.is_trigger and variant_entry is nodes.get(
            "tool"
        )
        resolved.n8n_credential_type = _credential_type_for(step.service)

        # Only the standalone/tool variant has a resource/operation menu to
        # resolve against -- a trigger step never needs this.
        if not step.is_trigger and step.resource and not step.operation:
            verb = guess_universal_verb(step.action)
            op = (
                resolve_operation(step.service, verb, resource=step.resource)
                if verb
                else None
            )
            if op:
                step.operation = op["value"]
            else:
                resolved.kind = "no_operation_match"
                from app.core.n8n_operation_registry import list_operations

                resolved.candidates = list_operations(
                    step.service, resource=step.resource
                )

        resolved.name = _unique_name(
            entry.get("display_name", step.service), used_names
        )
        return resolved

    if kind == "ai_subnode":
        standalone = nodes.get("standalone")
        if standalone is None:
            resolved = ResolvedNode(step=step.step, kind="no_operation_match")
            resolved.name = _unique_name(step.service, used_names)
            return resolved
        resolved = ResolvedNode(step=step.step, kind="ai_subnode")
        resolved.node_type = standalone["type"]
        resolved.type_version = standalone["typeVersion"]
        resolved.ai_connection_type = "ai_languageModel"
        resolved.n8n_credential_type = _credential_type_for(step.service)
        resolved.name = _unique_name(
            entry.get("display_name", step.service), used_names
        )
        return resolved

    if kind == "multi_node_hub":
        families = list_families(step.service)
        ai_families = {
            n: f for n, f in families.items() if f.get("kind") == "ai_subnode"
        }
        family_name = None
        if ai_families:
            verb = guess_universal_verb(step.action) or "generate"
            family_name = resolve_ai_subnode_family(step.service, verb)

        if family_name is None:
            # Non-AI hub disambiguation (e.g. AWS's ~23 product nodes) isn't
            # solved generically yet -- these aren't in the Groq whitelist
            # per n8n_operation_registry.py's own docstring, so this is a
            # deliberate stop rather than a guess. Revisit at Step 9.
            resolved = ResolvedNode(step=step.step, kind="no_operation_match")
            resolved.candidates = [{"family": name} for name in families]
            resolved.name = _unique_name(step.service, used_names)
            return resolved

        family = families[family_name]
        resolved = ResolvedNode(step=step.step, kind="ai_subnode")
        resolved.node_type = family["type"]
        resolved.type_version = family["typeVersion"]
        resolved.ai_connection_type = "ai_languageModel"
        resolved.n8n_credential_type = _credential_type_for(step.service, family_name)
        resolved.name = _unique_name(
            f"{entry.get('display_name', step.service)}", used_names
        )
        return resolved

    # Unknown/unhandled kind -- fail loud via the report, not a silent HTTP guess.
    resolved = ResolvedNode(step=step.step, kind="no_operation_match")
    resolved.candidates = []
    resolved.name = _unique_name(step.service, used_names)
    return resolved
