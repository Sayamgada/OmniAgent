# app/services/workflow_generator.py
import re
from functools import lru_cache

from app.models.automation_preview_model import automation_preview_collection
from app.services.llm_service import generate_workflow_from_prompt
from app.core.n8n_operation_registry import (
    get_service_entry,
    get_trigger_node,
    resolve_operation,
    resolve_resource,
    resolve_http_method,
)
from app.core.integration_catalog import INTEGRATION_CATALOG

# Service keys the catalog carries for generic/abstract auth mechanisms, not
# real external services (e.g. the raw "give me a header auth credential"
# base types some services build on). These have no place in a workflow
# step's "service" field - excluding them here rather than in the catalog
# itself, since integration_catalog.py may still need them as valid
# n8n_credential_type owners for OTHER services' auth_options.
_EXCLUDED_SERVICE_KEYS = {
    "http_basic_auth",
    "http_digest_auth",
    "http_header_auth",
    "http_query_auth",
    "http_custom_auth",
    "http_ssl_auth",
    "http_multiple_headers_auth",
    "http_templated_custom_auth",
    "o_auth1_api",
    "o_auth2_api",
}

# "http" and "webhook" are the prompt's designated fallback values for
# "nothing in the catalog fits" (see RULE 7 SERVICE below) - they are NOT
# integration_catalog.py keys (no credentialed integration named literally
# "http" or "webhook" exists), so they must be allowed independently of
# whatever the catalog contains.
_FALLBACK_SERVICE_KEYS = {"http", "webhook"}


@lru_cache(maxsize=1)
def _build_service_whitelist() -> dict:
    """
    Builds the SERVICE whitelist directly from integration_catalog.py
    instead of a hand-maintained static list, so the prompt can never drift
    out of sync with the actual credential catalog again.

    AI provider services (kind == "ai_subnode" in generated_registry.json) are
    excluded except "groq" - these are Chat Model / Vector Store / Tool
    sub-nodes that can never be a standalone workflow step's service (see
    n8n_operation_registry.py's `kind` docstring); "groq" stays as the one
    hardcoded-supported AI provider per the existing RULE 3 convention.

    Cached for the process lifetime - INTEGRATION_CATALOG and
    generated_registry.json are both static data loaded at import time, not
    something that changes per-request.

    Returns {"category name": [sorted service keys], ...}.
    """
    from app.core.n8n_operation_registry import get_kind  # local import avoids a hard

    # dependency for callers that only need integration_catalog behavior

    by_category: dict[str, list[str]] = {}
    for service, entry in sorted(INTEGRATION_CATALOG.items()):
        if service in _EXCLUDED_SERVICE_KEYS:
            continue
        if get_kind(service) == "ai_subnode" and service != "groq":
            continue
        by_category.setdefault(entry["category"], []).append(service)

    return by_category


@lru_cache(maxsize=1)
def _trigger_only_services() -> frozenset:
    """
    Services whose registry kind is "trigger_only": n8n ships a trigger node for
    them but no action node, so they can fire a workflow yet can never be
    compiled as a step. Derived from the registry's own `kind`, never from a
    hand-written list. They stay in _valid_service_keys() (valid for triggers).
    """
    from app.core.n8n_operation_registry import get_kind

    by_category = _build_service_whitelist()
    return frozenset(
        s
        for services in by_category.values()
        for s in services
        if get_kind(s) == "trigger_only"
    )


def _service_whitelist_text() -> str:
    """Renders _build_service_whitelist() as the category-grouped block that
    gets spliced into SYSTEM_INSTRUCTION in place of the old static list.

    Trigger-only services are left out of the category lists (those are the
    values a STEP may use) and rendered in a separate block that states they
    are valid only as trigger.service."""
    by_category = _build_service_whitelist()
    trigger_only = _trigger_only_services()
    lines = []
    for category in sorted(by_category):
        step_services = [s for s in by_category[category] if s not in trigger_only]
        if not step_services:
            continue
        lines.append(category)
        lines.append(", ".join(step_services))
        lines.append("")
    if trigger_only:
        lines.append(
            "TRIGGER-ONLY SERVICES (valid ONLY as preview_json.trigger.service - "
            "they have no action capability, so NEVER use one as a workflow "
            'step\'s "service")'
        )
        lines.append(", ".join(sorted(trigger_only)))
        lines.append("")
    return "\n".join(lines).rstrip()


@lru_cache(maxsize=1)
def _valid_service_keys() -> frozenset:
    by_category = _build_service_whitelist()
    keys = {s for services in by_category.values() for s in services}
    return frozenset(keys | _FALLBACK_SERVICE_KEYS)


CURRENT_SCHEMA_VERSION = 10

_ALLOWED_TOP_LEVEL_KEYS = {
    "schema_version",
    "automation_name",
    "automation_description",
    "required_integrations",
    "preview_json",
}

_REQUIRED_TOP_LEVEL_KEYS = _ALLOWED_TOP_LEVEL_KEYS  # all five are mandatory

_ALLOWED_OPERATIONS = {
    "create",
    "read",
    "update",
    "delete",
    "list",
    "send",
    "search",
    "generate",
    "upload",
    "download",
}


_APPROVAL_LANGUAGE_KEYWORDS = (
    "approve",
    "approval",
    "reject",
    "decision",
    "accept",
    "decline",
    "based on the outcome",
    "if approved",
    "if rejected",
)


def _check_approval_branching(automation_description: str, preview_json: dict) -> None:
    if not isinstance(automation_description, str):
        return
    description_lower = automation_description.lower()
    matched_keywords = [
        kw for kw in _APPROVAL_LANGUAGE_KEYWORDS if kw in description_lower
    ]
    if not matched_keywords:
        return

    steps = preview_json.get("workflow", []) if isinstance(preview_json, dict) else []
    has_condition = any(
        isinstance(step, dict) and isinstance(step.get("condition"), dict)
        for step in steps
    )
    if not has_condition:
        print(
            f"[workflow_generator] COMPLIANCE MISS: automation_description "
            f"contains approval/decision language {matched_keywords} but no "
            f"workflow step has a 'condition' key - expected a branch per the "
            f"CRITICAL rule in SYSTEM_INSTRUCTION. automation_description: "
            f"{automation_description!r}"
        )


def _check_operations(preview_json: dict) -> None:
    steps = preview_json.get("workflow", []) if isinstance(preview_json, dict) else []
    for step in steps:
        op = step.get("operation") if isinstance(step, dict) else None
        if op not in _ALLOWED_OPERATIONS:
            print(
                f"[workflow_generator] Step {step.get('step')} used non-standard "
                f"operation '{op}' for service '{step.get('service')}' - expected "
                f"one of {sorted(_ALLOWED_OPERATIONS)}"
            )
        _check_target(step)
        _check_service(step)
        _check_trigger_only_step(step)
        _check_trigger_refetch(step, preview_json)
        _check_depends_on(step, steps)
        _check_parallel_depends_on(step, steps)
        _check_condition_branch(step, steps)
        _check_missing_branch(step, steps)
        _check_routing_instructions(step)
        _check_ai_instructions(step)


_DRAFT_LANGUAGE_RE = re.compile(
    r"\b(draft(?:s|ed|ing)?|prepar(?:e|es|ed|ing)|propos(?:e|es|ed|ing)|"
    r"compos(?:e|es|ed|ing)|suggest(?:s|ed|ing)?|queue(?:s|d)?|queu(?:ing)|"
    r"queueing|stag(?:e|es|ed|ing))\b",
    re.IGNORECASE,
)


def _check_action_escalation(description: str, preview_json: dict) -> None:
    """
    Non-fatal, heuristic. The request uses draft-like wording but a step's
    operation is "send": the action may have been escalated beyond what the user
    asked. Heuristic because the request may ask for a draft AND, separately,
    a genuine send (e.g. summarise to Slack); flags for review, never blocks.
    Needs the original request, so it is called from generate_groq_workflow.
    """
    if not isinstance(description, str) or not isinstance(preview_json, dict):
        return
    matched = sorted(
        {m.group(0).lower() for m in _DRAFT_LANGUAGE_RE.finditer(description)}
    )
    if not matched:
        return
    steps = preview_json.get("workflow", [])
    sends = [s for s in steps if isinstance(s, dict) and s.get("operation") == "send"]
    if sends:
        print(
            f"[workflow_generator] COMPLIANCE MISS (possible): request contains "
            f"draft-like wording {matched} but step(s) "
            f"{[s.get('step') for s in sends]} use operation 'send'. Verify the "
            f"user did not ask only for a draft/prepared item. Request: "
            f"{description!r}"
        )


_REPLY_FORMAT_RE = re.compile(
    r"\b(respond|reply|return|output|answer|say|write)\b[^.\n]{0,60}[\"\u201c\u201d']",
    re.IGNORECASE,
)


def _check_routing_instructions(step: dict) -> None:
    """Non-fatal. Instructions of a conditioned AI step that dictate reply
    words (e.g. 'respond with "yes"') conflict with the routing marker the
    compiler appends."""
    if not isinstance(step, dict) or step.get("service") != "groq":
        return
    if not isinstance(step.get("condition"), dict):
        return
    instr = step.get("instructions")
    if isinstance(instr, str) and _REPLY_FORMAT_RE.search(instr):
        print(
            f"[workflow_generator] COMPLIANCE MISS: step {step.get('step')} has a "
            f"'condition' but its instructions dictate reply words/format. "
            f"Describe the decision criteria only; the compiler adds the reply "
            f"format. Instructions: {instr!r}"
        )


def _missing_branch_deps(step: dict, all_steps: list) -> list:
    """[(dep_step_number, [branch labels])] for each dependency of `step` that
    forks via a "condition", when `step` itself carries no "branch"."""
    if not isinstance(step, dict) or step.get("branch") is not None:
        return []
    deps = step.get("depends_on")
    if not isinstance(deps, list):
        return []
    by_num = {s.get("step"): s for s in all_steps if isinstance(s, dict)}
    found = []
    for d in deps:
        dep = by_num.get(d)
        cond = dep.get("condition") if isinstance(dep, dict) else None
        if (
            isinstance(cond, dict)
            and isinstance(cond.get("branches"), list)
            and cond["branches"]
        ):
            found.append((d, list(cond["branches"])))
    return found


def _check_missing_branch(step: dict, all_steps: list) -> None:
    """
    Non-fatal, heuristic. A step that depends on a step carrying a "condition"
    but has no "branch" runs for EVERY outcome of that condition. That is only
    right for an always-run step (e.g. logging), so this flags for review.
    """
    for d, branches in _missing_branch_deps(step, all_steps):
        print(
            f"[workflow_generator] COMPLIANCE MISS (possible): step "
            f"{step.get('step')} depends on step {d}, which forks into "
            f"{branches}, but carries no 'branch'. It will run for "
            f"every outcome - verify it is meant to, otherwise tag it with "
            f"the outcome it belongs to."
        )


def _collect_missing_branch_problems(preview_json: dict) -> list:
    steps = preview_json.get("workflow", []) if isinstance(preview_json, dict) else []
    return [
        (s.get("step"), d, b) for s in steps for d, b in _missing_branch_deps(s, steps)
    ]


async def _retry_on_missing_branch(
    user_content: str, system_instruction: str, result: dict
) -> dict:
    """
    One corrective retry when a step depends on a forking step but carries no
    "branch" (it would run for every outcome, e.g. replying to unrelated
    emails). Non-fatal by design: if the retry fails or is no better, the
    original result is kept.
    """
    problems = _collect_missing_branch_problems(result.get("preview_json", {}))
    if not problems:
        return result
    print(
        f"[workflow_generator] retrying once: {len(problems)} step(s) depend on a "
        f"forking step without a 'branch'"
    )
    feedback = (
        "\n\nCORRECTION REQUIRED. Your previous attempt was rejected because: "
        + "; ".join(
            f'step {s} depends on step {d}, which forks into {b}, but carries no "branch"'
            for s, d, b in problems
        )
        + ". Regenerate the complete JSON for the same request. Every step that "
        'depends on a step with a "condition" and applies to only some of its '
        'outcomes must carry the matching "branch" (an outcome with nothing to '
        "do gets no step). Return only the JSON."
    )
    try:
        raw2 = await generate_workflow_from_prompt(
            user_content + feedback, system_instruction
        )
        result2 = _sanitize_workflow_output(raw2)
    except Exception as e:  # never let the retry break generation
        print(f"[workflow_generator] retry failed ({e!r}); keeping first result")
        return result
    remaining = _collect_missing_branch_problems(result2.get("preview_json", {}))
    if len(remaining) < len(problems):
        print(f"[workflow_generator] retry improved result ({len(remaining)} left)")
        return result2
    print("[workflow_generator] retry no better; keeping first result")
    return result


def _check_trigger_refetch(step: dict, preview_json: dict) -> None:
    """
    Service-agnostic compliance check for the TRIGGER-DELIVERED DATA rule.

    A service-backed trigger already delivers the item that fired it. A step
    that (a) uses the same service as the trigger, (b) is a plain "read", and
    (c) depends on no earlier step, is the typical shape of a redundant
    re-fetch of that item. Non-fatal and heuristic by design: it can't tell a
    genuine read of DIFFERENT data from the same service (e.g. a thread or
    history lookup), so it flags for review rather than blocking or dropping.
    """
    if not isinstance(step, dict) or not isinstance(preview_json, dict):
        return
    trigger = preview_json.get("trigger")
    if not isinstance(trigger, dict):
        return
    trigger_service = trigger.get("service")
    if not trigger_service or step.get("service") != trigger_service:
        return
    if step.get("operation") != "read":
        return
    if step.get("depends_on"):
        return
    print(
        f"[workflow_generator] COMPLIANCE MISS (possible): step {step.get('step')} "
        f"is a dependency-free 'read' on '{trigger_service}', the same service "
        f"that fires the trigger. The trigger already delivers its item - verify "
        f"this step retrieves DIFFERENT data, otherwise it is a redundant re-fetch."
    )


def _check_trigger_only_step(step: dict) -> None:
    """Non-fatal: a step whose service is trigger-only can never compile."""
    if not isinstance(step, dict):
        return
    service = step.get("service")
    if service and service in _trigger_only_services():
        print(
            f"[workflow_generator] COMPLIANCE MISS: step {step.get('step')} uses "
            f"trigger-only service '{service}', which has no action node in n8n "
            f"and cannot compile as a step. It is valid only as trigger.service."
        )


def _check_service(step: dict) -> None:
    if not isinstance(step, dict):
        return
    service = step.get("service")
    if service and service not in _valid_service_keys():
        print(
            f"[workflow_generator] Step {step.get('step')} used service "
            f"'{service}' which is not in the current catalog-derived "
            f"whitelist (and isn't 'http'/'webhook')."
        )


def _check_target(step: dict) -> None:
    """
    Uses list_resources() rather than reaching into the registry entry
    directly, since resources now live nested under
    entry["nodes"]["standalone"] rather than at the entry's top level.
    """
    if not isinstance(step, dict):
        return
    service = step.get("service")
    target = step.get("target")
    entry = get_service_entry(service) if service else None
    if not entry or entry.get("kind") != "action_node":
        return  # ai_subnode / trigger_only / flat_params_node / http_only / unmapped - target isn't meaningful here
    from app.core.n8n_operation_registry import list_resources

    resources = list_resources(service)
    if not resources:
        return  # flat operation list (e.g. postgres) - no target needed
    if not target:
        print(
            f"[workflow_generator] Step {step.get('step')} for service '{service}' "
            f"has resources {sorted(resources)} but no 'target' set."
        )
    elif target not in resources:
        print(
            f"[workflow_generator] Step {step.get('step')} target '{target}' is not "
            f"a known resource for '{service}' - expected one of {sorted(resources)}"
        )


def _check_ai_instructions(step: dict) -> None:
    if not isinstance(step, dict):
        return
    if step.get("service") != "groq":
        return
    instructions = step.get("instructions")
    if (
        not instructions
        or not isinstance(instructions, str)
        or not instructions.strip()
    ):
        print(
            f"[workflow_generator] Step {step.get('step')} is a groq step "
            f"with no 'instructions' field - required by SYSTEM_INSTRUCTION, "
            f"compiler cannot build the AI Agent node's prompt without it."
        )
    elif len(instructions.strip()) < 25:
        print(
            f"[workflow_generator] Step {step.get('step')} 'instructions' "
            f"looks too short/vague to be useful to the compiler: {instructions!r}"
        )


def _check_depends_on(step: dict, all_steps: list) -> None:
    if not isinstance(step, dict):
        return
    this_step = step.get("step")
    depends_on = step.get("depends_on", [])
    if not isinstance(depends_on, list):
        print(
            f"[workflow_generator] Step {this_step} has non-list 'depends_on': "
            f"{depends_on!r} - expected a list of step numbers."
        )
        return

    known_steps = {s.get("step") for s in all_steps if isinstance(s, dict)}
    for ref in depends_on:
        if ref not in known_steps:
            print(
                f"[workflow_generator] Step {this_step} has 'depends_on' "
                f"referencing step {ref}, which does not exist in this workflow."
            )
        elif isinstance(this_step, int) and isinstance(ref, int) and ref >= this_step:
            print(
                f"[workflow_generator] Step {this_step} has 'depends_on' "
                f"referencing step {ref}, which is not strictly earlier - "
                f"a step cannot depend on itself or a later step."
            )


def _check_parallel_depends_on(step: dict, all_steps: list) -> None:
    if not isinstance(step, dict):
        return
    this_step = step.get("step")
    service = step.get("service")
    operation = step.get("operation")
    depends_on = step.get("depends_on", [])
    if not isinstance(depends_on, list) or not service:
        return

    steps_by_number = {s.get("step"): s for s in all_steps if isinstance(s, dict)}
    for ref in depends_on:
        upstream = steps_by_number.get(ref)
        if not upstream:
            continue  # already flagged by _check_depends_on
        if (
            upstream.get("service") == service
            and upstream.get("operation") == operation
        ):
            # A step routed off one of the upstream step's own condition
            # branches is a deliberate chain (the upstream decides, this step
            # acts on one outcome), not two independent reads wrongly chained.
            upstream_condition = upstream.get("condition")
            upstream_branches = (
                upstream_condition.get("branches")
                if isinstance(upstream_condition, dict)
                else None
            )
            if (
                step.get("branch") is not None
                and isinstance(upstream_branches, list)
                and step.get("branch") in upstream_branches
            ):
                continue
            print(
                f"[workflow_generator] Step {this_step} depends_on step {ref} - "
                f"both use service '{service}' / operation '{operation}'. This is "
                f"the same shape as a confirmed bug (two independent reads spuriously "
                f"chained instead of left parallel) - verify step {this_step} genuinely "
                f"needs step {ref}'s output, not just that they're conceptually related."
            )


def _check_condition_branch(step: dict, all_steps: list) -> None:
    if not isinstance(step, dict):
        return
    this_step = step.get("step")

    condition = step.get("condition")
    if condition is not None:
        branches = condition.get("branches") if isinstance(condition, dict) else None
        if not isinstance(branches, list) or not branches:
            print(
                f"[workflow_generator] Step {this_step} has a 'condition' with "
                f"no non-empty 'branches' list: {condition!r}"
            )

    branch = step.get("branch")
    if branch is not None:
        declared_branches = set()
        for s in all_steps:
            if not isinstance(s, dict):
                continue
            s_num = s.get("step")
            if (
                not isinstance(this_step, int)
                or not isinstance(s_num, int)
                or s_num >= this_step
            ):
                continue
            s_condition = s.get("condition")
            if isinstance(s_condition, dict) and isinstance(
                s_condition.get("branches"), list
            ):
                declared_branches.update(s_condition["branches"])
        if branch not in declared_branches:
            print(
                f"[workflow_generator] Step {this_step} has 'branch': {branch!r} "
                f"which doesn't match any 'branches' value declared by an "
                f"earlier step's 'condition' - dangling branch reference."
            )


def _enrich_trigger(preview_json: dict) -> dict:
    """
    Validates preview_json["trigger"] against the real registry instead of trusting
    Groq's free-text "type"/"service" pair as-is. Mirrors _enrich_with_real_operations'
    additive pattern: never removes or renames what Groq wrote ("type"/"service"/
    "description" stay exactly as generated), only adds:

        "n8n_trigger_resolved": true | false
        "n8n_trigger_node": {"type", "typeVersion"} | None

    Three cases:
      1. trigger.service is set and get_trigger_node() finds a real trigger node for
         it (e.g. gmail -> gmailTrigger) -> resolved True, node attached. Expected
         case for type in {Event, Email, Form Submission}.
      2. trigger.service is set but that service has NO trigger node in the registry
         at all -> resolved False, node None. A genuine compliance miss - the chosen
         service literally cannot fire this trigger in n8n.
      3. trigger.type is Manual/Schedule/Webhook/API Call, where "service" is
         legitimately empty per SYSTEM_INSTRUCTION -> resolved True with a synthetic
         reference to n8n's own generic trigger node for that type.
    """
    _GENERIC_TRIGGER_NODES = {
        "Manual": {"type": "n8n-nodes-base.manualTrigger", "typeVersion": 1},
        "Schedule": {"type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1.2},
        "Webhook": {"type": "n8n-nodes-base.webhook", "typeVersion": 2},
        "API Call": {"type": "n8n-nodes-base.webhook", "typeVersion": 2},
    }

    trigger = preview_json.get("trigger") if isinstance(preview_json, dict) else None
    if not isinstance(trigger, dict):
        return preview_json

    trigger_type = trigger.get("type")
    service = trigger.get("service") or None

    if trigger_type in _GENERIC_TRIGGER_NODES and not service:
        trigger["n8n_trigger_resolved"] = True
        trigger["n8n_trigger_node"] = _GENERIC_TRIGGER_NODES[trigger_type]
        return preview_json

    if not service:
        print(
            f"[workflow_generator] trigger.type={trigger_type!r} requires a "
            f"'service' per SYSTEM_INSTRUCTION but none was set."
        )
        trigger["n8n_trigger_resolved"] = False
        trigger["n8n_trigger_node"] = None
        return preview_json

    node = get_trigger_node(service)
    if node:
        trigger["n8n_trigger_resolved"] = True
        trigger["n8n_trigger_node"] = node
    else:
        print(
            f"[workflow_generator] trigger.service '{service}' has no real n8n "
            f"trigger node in the registry - trigger.type={trigger_type!r} cannot "
            f"actually be fired by this service; needs review."
        )
        trigger["n8n_trigger_resolved"] = False
        trigger["n8n_trigger_node"] = None

    return preview_json


def _enrich_with_real_operations(preview_json: dict) -> dict:
    """
    THE fix for hardcoded operations. Runs once per generation, right after
    Groq returns and before the preview is stored or returned. For every
    step, looks up the real n8n resource/operation from generated_registry.json
    and attaches it.

    Adds two keys per step; never removes or renames the originals:

        "n8n_resolved": true | false
        "n8n_operation": {"label", "value", "action"} | null

    When resolution fails (ambiguous/missing target, no confident match, or
    the service is ai_subnode / trigger_only / flat_params_node / http_only /
    unmapped), n8n_operation stays null and n8n_resolved is false -
    deliberately, not a bug. resolve_operation() itself never considers
    another service's operations and never guesses on ambiguity (see
    n8n_operation_registry.py's module docstring).
    """
    _AI_SUBNODE_CHAT_MODEL_TYPES = {
        "groq": "@n8n/n8n-nodes-langchain.lmChatGroq",
    }
    _AI_AGENT_ROOT_NODE_TYPE = "@n8n/n8n-nodes-langchain.agent"
    _AI_LANGUAGE_MODEL_CONNECTION_TYPE = "ai_languageModel"

    steps = preview_json.get("workflow", []) if isinstance(preview_json, dict) else []
    for step in steps:
        if not isinstance(step, dict):
            continue
        service = step.get("service")
        verb = step.get("operation")
        target = step.get("target") or None

        entry = get_service_entry(service) if service else None
        kind = entry.get("kind") if entry else None

        if kind == "ai_subnode":
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            step["n8n_resolution_kind"] = "ai_subnode"
            step["n8n_subnode"] = {
                "root_node_type": _AI_AGENT_ROOT_NODE_TYPE,
                "connection_type": _AI_LANGUAGE_MODEL_CONNECTION_TYPE,
                "chat_model_node_type": _AI_SUBNODE_CHAT_MODEL_TYPES.get(service),
                "agent_instructions_source": "step.instructions",
            }
            continue

        if kind == "http_only":
            method = resolve_http_method(verb)
            standalone = entry.get("nodes", {}).get("standalone", {})
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            step["n8n_resolution_kind"] = "http_only"
            step["n8n_http_node"] = {
                "node_type": standalone.get("type", "n8n-nodes-base.httpRequest"),
                "typeVersion": standalone.get("typeVersion"),
                "base_url": standalone.get("base_url"),
                "method": method,
            }
            continue

        if kind == "flat_params_node":
            method = resolve_http_method(verb)
            standalone = entry.get("nodes", {}).get("standalone", {})
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            step["n8n_resolution_kind"] = "flat_params_node"
            step["n8n_http_node"] = {
                "node_type": standalone.get("type"),
                "typeVersion": standalone.get("typeVersion"),
                "method": method,
            }
            continue

        if kind == "trigger_only":
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            step["n8n_resolution_kind"] = "trigger_only"
            continue

        if not entry:
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            step["n8n_resolution_kind"] = "unmapped"
            continue

        if kind != "action_node":
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            step["n8n_resolution_kind"] = "unsupported_kind"
            continue

        # The model names the plainest noun ("row"), which is often not one
        # of the service's real resource keys ("sheet"). Repair it from the
        # registry's own operation text when that can be done unambiguously;
        # the original is kept as target_original for traceability.
        noun_hint = None
        if target:
            repaired = resolve_resource(service, target, verb)
            if repaired and repaired != target:
                step["target_original"] = target
                step["target"] = repaired
                noun_hint = target
                target = repaired
        op = resolve_operation(service, verb, resource=target, noun_hint=noun_hint)
        step["n8n_resolved"] = op is not None
        step["n8n_operation"] = op
        step["n8n_resolution_kind"] = (
            "action_node" if op is not None else "no_operation_match"
        )

    return preview_json


def _summarize_resolution(preview_json: dict) -> dict:
    """
    Now also reflects trigger resolution (see _enrich_trigger), not just
    workflow steps.

        {"total": 4, "resolved": 3, "unresolved_steps": [3], "trigger_resolved": true}
    """
    steps = preview_json.get("workflow", []) if isinstance(preview_json, dict) else []
    unresolved = [
        s.get("step")
        for s in steps
        if isinstance(s, dict) and not s.get("n8n_resolved")
    ]
    trigger = preview_json.get("trigger") if isinstance(preview_json, dict) else None
    trigger_resolved = (
        bool(trigger.get("n8n_trigger_resolved")) if isinstance(trigger, dict) else None
    )
    return {
        "total": len(steps),
        "resolved": len(steps) - len(unresolved),
        "unresolved_steps": unresolved,
        "trigger_resolved": trigger_resolved,
    }


def _sanitize_workflow_output(raw: dict) -> dict:
    if not isinstance(raw, dict):
        raise ValueError(f"Expected a JSON object from Groq, got {type(raw).__name__}")

    missing = _REQUIRED_TOP_LEVEL_KEYS - raw.keys()
    if missing:
        raise ValueError(
            f"Groq response is missing required key(s): {sorted(missing)}. "
            f"Raw keys returned: {sorted(raw.keys())}"
        )

    dropped = raw.keys() - _ALLOWED_TOP_LEVEL_KEYS
    if dropped:
        print(
            f"[workflow_generator] Stripped non-conforming keys from Groq output: {sorted(dropped)}"
        )

    sanitized = {key: raw[key] for key in _ALLOWED_TOP_LEVEL_KEYS}
    sanitized["schema_version"] = CURRENT_SCHEMA_VERSION
    _check_operations(sanitized.get("preview_json", {}))
    _check_approval_branching(
        sanitized.get("automation_description", ""), sanitized.get("preview_json", {})
    )
    _enrich_with_real_operations(sanitized.get("preview_json", {}))
    _enrich_trigger(sanitized.get("preview_json", {}))
    return sanitized


async def generate_groq_workflow(
    domain: str,
    description: str,
    context: str,
):

    SYSTEM_INSTRUCTION = """
        You are OmniAgent's AI Workflow Designer.

        Your responsibility is to convert a user's natural language automation request into a structured Automation Preview JSON.

        The generated JSON will be used to:

        1. Display an automation preview to the user.
        2. Determine which integrations and credentials are required.
        3. Compile the preview into an executable n8n workflow.

        You may also receive similar automations retrieved from the knowledge base.

        Use them only for inspiration.
        Never copy them directly.
        Infer missing workflow details logically.

        --------------------------------------------------
        OUTPUT

        Return ONLY valid JSON.

        Do not return markdown.
        Do not return explanations.
        Do not return code.

        The output MUST contain EXACTLY these five top-level keys, in this order, and
        no others:

        schema_version
        automation_name
        automation_description
        required_integrations
        preview_json

        Do NOT add any other top-level keys under any circumstances. In particular,
        never add: task_summary, intent_type, complexity, required_agents,
        inputs_required, expected_outputs, tools_required, constraints, trigger_type,
        edge_cases, success_criteria, agent, input, output, or a second top-level
        "workflow" array. The ONLY place "workflow" may appear is nested inside
        preview_json, exactly as shown below. If you are unsure whether a field
        belongs, leave it out — an incomplete-but-valid object is correct; an
        extended object is not.

        Use EXACTLY this schema:

        {
        "schema_version": 10,
        "automation_name": "",
        "automation_description": "",

        "required_integrations": [
            {
            "service": "",
            "display_name": "",
            "required": true
            }
        ],

        "preview_json": {
            "title": "",
            "description": "",

            "trigger": {
            "type": "",
            "service": "",
            "description": ""
            },

            "workflow": [
            {
                "step": 1,
                "service": "",
                "operation": "",
                "target": "",
                "parameters": {},
                "depends_on": []
            }
            ],

            (A step where "service" is "groq" MUST also include an
            "instructions" string field - see the GROQ / AI STEPS -
            INSTRUCTIONS section below. Every other step omits "instructions"
            entirely.)

            "output": ""
        }
        }

        A step MAY also carry "condition" and/or "branch" - see the CONDITION /
        BRANCH section below. Both are OPTIONAL and omitted entirely on steps
        that don't need them - do not add empty/null placeholders for them.

        --------------------------------------------------
        CRITICAL - APPROVAL / DECISION AUTOMATIONS MUST BRANCH

        Before generating "workflow", check automation_description and the
        user's request for approval/decision language: "approve"/"reject",
        "approval", "decision", "accept"/"decline", "based on the outcome of",
        "if approved"/"if rejected", or similar. If any such language is
        present, the workflow you generate MUST include a "condition" object
        on the step that produces the outcome, and a "branch" tag on every
        downstream step that only makes sense for one outcome. A flat,
        unconditional chain of steps is WRONG for this class of automation,
        even if every individual step's operation/target/service is correct.
        This is a hard requirement, not a stylistic preference - see the full
        CONDITION / BRANCH section under RULES 7 for the exact shape.

        --------------------------------------------------
        RULES

        1. automation_name
        - 3-8 words
        - Human readable
        - Suitable as an automation title

        2. automation_description
        - One or two concise sentences describing the automation.

        3. required_integrations

        List ONLY the services that require user credentials or configuration.

        "display_name" should be user-friendly, e.g. "Gmail", "PostgreSQL", "AI Provider (Groq)".

        If any workflow step performs reasoning, summarization, classification,
        generation, translation, extraction, intent detection, decision making,
        or any other AI task, ALWAYS include:

        {
        "service": "groq",
        "display_name": "AI Provider (Groq)",
        "required": true
        }

        inside required_integrations. Groq is currently the only supported AI provider
        for generated automations. This is a temporary, hardcoded choice - a future
        version will let the user select their own LLM provider per workflow. Never
        use "llm" or "gemini" as the service value; the only valid service value
        for a REASONING/GENERATION step today is "groq". Other AI-category
        services that appear in the whitelist below (e.g. deep_l, open_ai,
        jina_ai) remain valid ONLY when the step performs that service's own
        specific, non-reasoning action (e.g. deep_l for translation, open_ai
        for image generation) - not as a substitute for groq on a reasoning step.

        --------------------------------------------------
        GROQ / AI STEPS - INSTRUCTIONS

        Every workflow step with "service": "groq" MUST include an
        "instructions" field: a self-contained string telling the AI exactly
        what to do with the data available to it at that point in the
        workflow. This is NOT the same as "automation_description" (which
        describes the whole automation) - it is the specific task for this
        one AI step.

        Requirements for "instructions":
        - Reference upstream steps by their step number when the AI step
          depends on their output, e.g. "Analyze the task data retrieved in
          step 1 ..." - do not use vague phrases like "the input" or "the
          data" with no antecedent.
        - State what the AI should produce, in enough detail that a person
          reading only this string (without seeing the rest of the workflow)
          understands the task, e.g. "... identify recurring delays or
          approval bottlenecks, and write a concise summary suitable for a
          management email" rather than just "summarize the data".
        - Do NOT include literal runtime values (specific names, dates,
          addresses) - describe the task, not filled-in content. Same
          structural-only rule that applies to "parameters" elsewhere in
          this schema.

        - For a step that carries a "condition": describe the decision
          criteria and what each outcome means, naming outcomes with the
          branch labels. NEVER tell the AI what words, tokens or format to
          reply with (no "respond with yes/no", no "return X or Y", no quoted
          answer words) - the system adds the required reply format itself,
          and a second, conflicting format breaks routing.

        A groq step with a missing or vague "instructions" field is an
        incomplete generation, equivalent to a step missing "operation" or
        "target" - it will be flagged and is not acceptable as a final
        answer.

        --------------------------------------------------
        4. preview_json.title

        Human-readable title.

        --------------------------------------------------
        5. preview_json.description

        Briefly explain what the automation accomplishes.

        --------------------------------------------------
        6. trigger

        "type" - choose exactly one:

        Manual
        Schedule
        Webhook
        Event
        Email
        Form Submission
        API Call

        "service" - the specific external service the trigger fires from, chosen from
        the service whitelist (Rule 7), including its TRIGGER-ONLY SERVICES block, AND that service
        must be one that genuinely has a trigger capability in n8n - do not pick a
        service purely because it appears elsewhere in the workflow if it has no
        trigger of its own. Required whenever "type" is Event, Email, or Form
        Submission, since those can be backed by more than one possible service (e.g.
        Email -> gmail vs outlook). For Manual, Schedule, Webhook, or API Call, set
        "service" to an empty string - these are never service-backed.

        --------------------------------------------------
        7. workflow

        Generate sequential workflow steps.

        Each step MUST contain exactly:

        step
        service
        operation
        target
        parameters
        depends_on

        A step MAY additionally contain "condition" and/or "branch" - only when
        the automation actually forks on an outcome. See CONDITION / BRANCH
        below. Do not add either key to a step that doesn't need it.

        SERVICE

        The "service" field MUST use one of the exact values below, grouped by
        category - this list is generated directly from the live integration
        catalog, so every value here is guaranteed to have a matching credential
        entry. Do NOT invent service names, and do NOT alter, abbreviate, or
        re-hyphenate a value (e.g. use "linked_in" exactly, not "linkedin"). If
        nothing fits, use "http" for a generic REST call or "webhook" for a
        generic incoming trigger, and set the corresponding
        required_integrations[].display_name to the real external system's name.

        {SERVICE_WHITELIST}

        A service listed under TRIGGER-ONLY SERVICES can fire a workflow but
        cannot perform any action. Use it only in preview_json.trigger.service.
        If a step needs to act on that system, use "http" or "webhook" and name
        the real system in required_integrations[].display_name.

        OPERATION

        The "operation" field MUST be exactly one of these ten universal values.
        These apply the same way to every service - there are no per-category or
        per-service operation lists to memorize, so this works unchanged for any
        service in the whitelist above, including ones added to the whitelist in
        the future:

        create, read, update, delete, list, send, search, generate, upload, download

        Pick whichever verb best describes the fundamental action of the step,
        regardless of which service performs it. Do not qualify or extend these
        verbs (no "send_message", no "create_event", no "generate_text") - the
        base verb alone is the operation. What specifically gets created, sent,
        or generated is conveyed by "target", "automation_description", the
        step's position in the workflow, and "parameters" - not by inventing a
        longer operation name.

        Examples (illustrating the PATTERN only):
        - Drafting or summarizing text with the AI provider -> "generate"
        - Sending an email or a Slack message -> "send"
        - Creating a calendar event, a Notion page, or a database row -> "create"
        - Looking something up or querying a database -> "read" or "search"
        - Attaching or storing a file -> "upload"

        USE THE WEAKEST VERB THAT SATISFIES THE REQUEST. Never escalate an
        action beyond what the user asked for. If the request says draft,
        prepare, propose, compose, suggest, queue or stage something, the step
        must NOT use "send" (or any operation that delivers or publishes it to
        a recipient or audience). Use "create" with the draft/prepared object
        as "target" instead. If the service has no draft or staging concept
        for that object, end the workflow at a "groq" "generate" step whose
        output is the draft, and say so in preview_json.output. Only use
        "send" when the user explicitly asks for the item to be sent,
        delivered, posted or published.

        Never invent an operation outside this list of ten, regardless of how
        unusual the service or action is. This universal verb, together with
        "target", is resolved deterministically against that service's OWN real
        operation list after generation - never against another service's
        operations, and never guessed when more than one of that service's real
        operations could plausibly match (such steps are flagged for review
        rather than silently assigned a possibly-wrong operation). Picking the
        verb/target combination that most specifically and unambiguously
        describes the action gives the resolver the best chance of a confident
        match.

        TARGET

        The "target" field names WHAT KIND of thing "operation" acts on, in ONE
        OR TWO WORDS. It exists because many services distinguish between several
        kinds of objects they can act on - a "create" on Gmail could mean create
        a draft or create a label; a "create" on Notion could mean create a page
        or create a database entry. "target" resolves that ambiguity.

        Use the plainest possible noun for the thing being acted on. Examples
        (illustrating the PATTERN only - do not memorize a fixed list, none
        exists):

        - Sending an email -> target: "message"
        - Creating a draft email -> target: "draft"
        - Creating a page in Notion -> target: "page"
        - Creating a database entry in Notion -> target: "database"
        - Creating a GitHub issue -> target: "issue"
        - Posting a Slack message -> target: "message"

        If the service performs only one kind of action and there's no real
        ambiguity about what's being acted on (e.g. a weather lookup, a plain
        HTTP call, sending an SMS), leave "target" as an empty string "" rather
        than inventing one. An empty target is the expected, correct output for
        many steps - do not force a value.

        Do not assume a service has only one kind of object just because the
        automation only uses it one way - some services (e.g. Google Sheets,
        which can act on a "sheet" or a "spreadsheet") are ambiguous by nature
        regardless of how the automation happens to use them. When in doubt
        between leaving "target" empty and picking one, prefer picking the
        most specific, plainest noun over leaving it empty.

        Never use "target" to describe runtime content (do not write the actual
        message text, a person's name, or a specific ID here) - same rule as
        "parameters". "target" is a category of thing, not an instance of one.

        PARAMETERS

        The "parameters" field is a flat key/value object holding ONLY static,
        structural configuration that is needed to identify WHERE within a service
        something happens - never WHAT the runtime content is.

        Examples of valid structural parameters: a Slack channel ID, a Google Sheet
        ID, a database table name, a Notion database ID, a specific folder path.

        NEVER include runtime content as a parameter, including but not limited to:
        message body or text, email subject line, recipient address or "to" field,
        event title or description used as content, start_time/end_time of an event,
        a prompt or instruction string, a search query string, file contents. This
        data is filled in by the user directly inside the n8n editor after
        deployment and must NOT appear in this JSON.

        Most steps will have NO structural configuration at all. In that case,
        "parameters" MUST be an empty object {}. An empty object is the expected,
        correct output for most steps - do not invent a parameter just to avoid
        leaving the object empty.

        Worked example (for illustration of the PATTERN only - do not copy these
        exact values for unrelated automations):

        {
        "step": 1,
        "service": "gmail",
        "operation": "send",
        "target": "message",
        "parameters": {}
        }

        {
        "step": 2,
        "service": "google_sheets",
        "operation": "update",
        "target": "sheet",
        "parameters": { "sheet_id": "SHEET_ID_HERE" }
        }

        The above is ONLY correct when the automation's description itself names
        a specific sheet (e.g. "update the Q3 Budget spreadsheet"). "sheet_id" is
        structural (which sheet to write to), not runtime content - but adding
        this key is the EXCEPTION, not something to reproduce on every
        google_sheets step out of habit.

        Contrast - same service, but the automation does NOT name a specific
        sheet, document, folder, or table:

        {
        "step": 2,
        "service": "google_sheets",
        "operation": "update",
        "target": "sheet",
        "parameters": {}
        }

        This is the default for google_sheets, exactly as for every other
        service. Do not add "sheet_id" (or any other key) as a placeholder,
        and never with an empty-string value - an empty string is not
        structural information, it is a promise to fill something in later,
        which is exactly what "parameters" must not do at preview stage. If
        in doubt about whether a specific resource was named, leave
        "parameters" as {}.
        "target" is still set to "sheet" in both cases above - "target" and
        "parameters" are independent: target always names the resource kind
        being acted on; parameters is populated only when a specific instance
        of that resource is actually named in the request.

        --------------------------------------------------
        DEPENDS_ON

        "depends_on" is a list of earlier step numbers whose OUTPUT this step's
        action genuinely needs at runtime - not just steps that happen to run
        earlier in the sequence.

        Ask: "does this step need a specific piece of data that only exists
        because an earlier step produced it?" If yes, list that step's number.
        If this step would make sense on its own with only the trigger data,
        use an empty list [].

        Examples (illustrating the PATTERN only):
        - A step that sends the initial request notification -> depends_on: []
          (it only needs the trigger data, nothing another step produced)
        - A step that updates a tracking sheet with a manager's decision,
          where an earlier step read that decision -> depends_on: [that step]
        - A step that posts a Slack message summarizing what an earlier
          "generate" (AI) step produced -> depends_on: [that step]

        Most steps depend on nothing but the trigger - [] is the expected,
        correct value for most steps, same as an empty "parameters". Do not
        list a step number just because it comes earlier in the workflow.

        A specific trap: two steps using the SAME service and operation to
        read two DIFFERENT instances of something (e.g. downloading a "new"
        file and a "previous" file, or reading two different records) are
        independent reads, not a sequence - one does not need the other's
        output just because they're conceptually related or get compared
        later. Compare the two shapes below:

        WRONG - treating two independent reads as sequential because they
        feel related:
        {"step": 1, "service": "google_drive", "operation": "read", "target": "file", "depends_on": []}
        {"step": 2, "service": "google_drive", "operation": "read", "target": "file", "depends_on": [1]}

        RIGHT - both reads are independent; only the step that actually
        needs BOTH outputs (e.g. the AI step comparing them) depends on both:
        {"step": 1, "service": "google_drive", "operation": "read", "target": "file", "depends_on": []}
        {"step": 2, "service": "google_drive", "operation": "read", "target": "file", "depends_on": []}
        {"step": 3, "service": "groq", "operation": "generate", "depends_on": [1, 2]}

        --------------------------------------------------
        TRIGGER-DELIVERED DATA

        The trigger is not a workflow step. When it fires, the item or payload
        that caused it (the incoming message, the new record, the submitted
        form, the received request body) is ALREADY available to every
        downstream step. This holds for every trigger type and every service.

        Therefore, do NOT add a step whose only purpose is to obtain, read,
        fetch, or receive what the trigger already delivered. Such a step is
        redundant and must be omitted. Start the workflow at the first step
        that does something with that data.

        Add a "read"/"list"/"search"/"download" step on the trigger's own
        service ONLY when it retrieves DIFFERENT data than the trigger
        delivered - for example, related or historical items, or data from a
        different resource than the one that fired the trigger.

        Ask: "Would this step return the same item the trigger already gave
        me?" If yes, omit it.

        --------------------------------------------------
        CONDITION / BRANCH

        Most automations are a single straight-line sequence and need neither
        of these keys anywhere. Only use them when the automation's own
        description implies the outcome of one step determines what happens
        next (approval/rejection, success/failure, yes/no decisions, routing
        based on a classification, etc).

        If automation_description or the user's request contains language like
        "approve"/"reject", "approval", "decision", "accept"/"decline",
        "based on the outcome of", "if approved"/"if rejected", or similar
        outcome-dependent phrasing, you MUST add a "condition" to the step that
        produces that outcome, and a "branch" tag on every downstream step
        whose execution depends on which outcome occurred. Do NOT represent an
        approval/decision automation as an unconditional straight line - a
        downstream step that only makes sense for one outcome (e.g. updating a
        tracker to "approved") must carry "branch": "approved", not run
        unconditionally after every outcome.

        "condition" goes on the step whose outcome causes the fork. It is an
        object with one field:

            "condition": { "branches": ["<outcome_a>", "<outcome_b>", ...] }

        List the possible outcomes in plain lowercase words (e.g. "approved" /
        "rejected", "success" / "failure"). Two branches is typical; only add
        more if the automation description genuinely implies more than two
        outcomes.

        "branch" goes on any LATER step that should only execute under one of
        those outcomes:

            "branch": "<one of the outcome strings from the condition step>"

        A later step with no "branch" key runs regardless of outcome (e.g. a
        final logging step that always fires). Therefore a step that only
        makes sense for ONE outcome MUST carry that "branch" - at every level
        of nesting. If step 2 should run only when step 1 decided "leave",
        step 2 carries "branch": "leave", even when step 2 itself also carries
        its own "condition" (a second-level fork). An outcome that needs no
        action (e.g. "other" -> ignore) gets no step at all; it does NOT mean
        the next step may omit its "branch". A later step that depends on
        the fork should also set "depends_on" to include the step carrying
        the "condition".

        Worked example (illustration only) - note this is exactly the pattern
        the CRITICAL rule above requires whenever automation_description
        contains approval/decision language such as "approval requests" or
        "based on the manager's decision":

        {
        "step": 3,
        "service": "groq",
        "operation": "generate",
        "target": "",
        "parameters": {},
        "depends_on": [],
        "instructions": "Evaluate the incoming request against the stated approval criteria and decide whether it should be approved or rejected, and give a short justification.",
        "condition": { "branches": ["approved", "rejected"] }
        }

        {
        "step": 4,
        "service": "google_sheets",
        "operation": "update",
        "target": "sheet",
        "parameters": {},
        "depends_on": [3],
        "branch": "approved"
        }

        If the automation description does not imply a fork, do not invent one -
        omit "condition" and "branch" entirely rather than adding them with
        placeholder values. But if it DOES imply a fork (see the CRITICAL rule
        above), omitting "condition"/"branch" is a compliance failure, not a
        safe default.

        --------------------------------------------------
        8. output

        Describe the final result produced by the automation.

        --------------------------------------------------
        SUPPORTED DOMAINS

        Corporate
        Education
        Finance (non-trading only)

        --------------------------------------------------
        IMPORTANT

        - Generate logical workflows.
        - Never invent unsupported services.
        - Never use an operation outside the ten universal values.
        - Only set "target" when the service genuinely has more than one kind of
          object it can act on; otherwise leave it "".
        - Never place runtime content inside "parameters".
        - Use "depends_on" only for real data dependencies, never for plain
          sequencing; [] is correct for most steps.
        - Only add "condition"/"branch" when the automation's description
          genuinely implies a fork; omit both entirely otherwise.
        - Never add a step that re-fetches what the trigger already delivered.
        - A step with a "condition" gets instructions that describe the decision
          criteria only, never the reply words or format.
        - A step that depends on a step with a "condition" and applies to only
          some of its outcomes must carry the matching "branch".
        - Use the weakest verb that satisfies the request: "draft"/"prepare"/
          "propose"/"compose"/"suggest"/"queue"/"stage" never means "send".
        - Never add top-level keys beyond the five specified.
        - Never output n8n nodes.
        - Never output implementation code.
        - Always return valid JSON only.
        """

    user_content = f""" 
        Domain:
        {domain}

        User Request:
        {description}

        Similar Automations:
        {context if context else "None"}
    """

    system_instruction = SYSTEM_INSTRUCTION.replace(
        "{SERVICE_WHITELIST}", _service_whitelist_text()
    )

    print("Groq")
    raw_workflow = await generate_workflow_from_prompt(user_content, system_instruction)
    result = _sanitize_workflow_output(raw_workflow)
    result = await _retry_on_missing_branch(user_content, system_instruction, result)
    _check_action_escalation(description, result.get("preview_json", {}))
    print("SANITIZED KEYS:", sorted(result.keys()))
    return result


async def fetch_mongo_workflow(
    automation_name: str,
    automation_description: str,
):
    print("Mongo")
    automation = await automation_preview_collection.find_one(
        {
            "automation_name": automation_name,
            "automation_description": automation_description,
        },
        {
            "_id": 0,
            "schema_version": 1,
            "automation_name": 1,
            "automation_description": 1,
            "preview_json": 1,
            "required_integrations": 1,
        },
    )

    if automation:
        return automation
    else:
        return None
