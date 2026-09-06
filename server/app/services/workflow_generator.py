from functools import lru_cache

from app.models.automation_preview_model import automation_preview_collection
from app.services.llm_service import generate_workflow_from_prompt
from app.core.n8n_operation_registry import (
    get_service_entry,
    resolve_operation,
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
    out of sync with the actual credential catalog again - see the
    workflow_generator/node_registry design notes for why the OLD static
    89-entry whitelist was actively broken (52 of its 89 keys didn't match
    ANY key in the current 386-service catalog - e.g. "linkedin" vs the
    catalog's "linked_in", "postgresql" vs "postgres", "youtube" vs
    "you_tube" - meaning steps using those services would silently fail to
    match a real credential entry at check-time).

    AI provider services (kind == "ai_subnode" in node_registry.json) are
    excluded except "groq" - these are Chat Model / Vector Store / Tool
    sub-nodes that can never be a standalone workflow step's service (see
    node_registry.py's `kind` docstring); "groq" stays as the one
    hardcoded-supported AI provider per the existing RULE 3 convention.

    Cached for the process lifetime - INTEGRATION_CATALOG and
    node_registry.json are both static data loaded at import time, not
    something that changes per-request.

    Returns {"category name": [sorted service keys], ...} and, separately,
    the flat set of every valid key (including the http/webhook fallbacks)
    for use by _check_service().
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


def _service_whitelist_text() -> str:
    """Renders _build_service_whitelist() as the category-grouped block that
    gets spliced into SYSTEM_INSTRUCTION in place of the old static list."""
    by_category = _build_service_whitelist()
    lines = []
    for category in sorted(by_category):
        lines.append(category)
        lines.append(", ".join(by_category[category]))
        lines.append("")
    return "\n".join(lines).rstrip()


@lru_cache(maxsize=1)
def _valid_service_keys() -> frozenset:
    by_category = _build_service_whitelist()
    keys = {s for services in by_category.values() for s in services}
    return frozenset(keys | _FALLBACK_SERVICE_KEYS)


CURRENT_SCHEMA_VERSION = 4
# v2 -> v3: two additions to each workflow step. The five-key top-level
# contract and _ALLOWED_OPERATIONS (the ten universal verbs) are UNCHANGED -
# this only touches the shape inside preview_json.workflow[].
#
#   1. "target" - Groq now names the resource being acted on (e.g.
#      "message", "draft", "page"), needed to disambiguate services that
#      have more than one kind of object they can act on. See the new
#      TARGET section in SYSTEM_INSTRUCTION below.
#
#   2. "n8n_operation" / "n8n_resolved" - populated deterministically by
#      _enrich_with_real_operations() AFTER Groq returns, using
#      node_registry.json - NOT written by Groq. This is what actually
#      fixes "operations are hardcoded": the preview now shows the real,
#      service-specific n8n operation for each step (e.g. "Post a message"
#      for Slack, not the bare universal verb "send"), pulled from real
#      n8n source, not invented.
#
# v3 -> v4: two further additions to each workflow step, both Groq-written
# (unlike n8n_operation/n8n_resolved, which stay enrichment-only):
#
#   3. "depends_on" - a list of earlier step numbers whose OUTPUT this
#      step's action needs at runtime (e.g. a "update sheet" step that
#      writes the outcome of an earlier "read response" step). This is NOT
#      sequencing - a step that merely runs after another but doesn't need
#      its output uses []. This exists so the future compile-time
#      parameter-fill UI can tell "this field should be wired to a
#      previous step's output" apart from "this field needs a plain text
#      value from the user" - see DEPENDS_ON section in SYSTEM_INSTRUCTION.
#
#   4. "condition" (optional, step-level, only present when a step's
#      outcome forks the workflow) and "branch" (optional, only present on
#      steps that only run under one outcome of an earlier step's
#      condition) - together these let an approval/decision-style
#      automation be represented as an actual fork instead of a flattened
#      straight line. Absent on every step for non-branching automations -
#      this is additive and does not disturb existing single-path
#      workflows. See CONDITION / BRANCH section in SYSTEM_INSTRUCTION.
#
# A v3-cached Mongo document has neither of these keys, so the version bump
# is required for the existing stale-cache regeneration check in
# agent_router.py to actually fire on old cache entries.

# The only keys the compiler/frontend/storage layer are allowed to see. Anything
# else the model emits (task_summary, required_agents, a duplicate top-level
# "workflow", etc.) is a prompt-compliance miss, not a real field, and must be
# dropped before this data is stored or returned. response_format=json_object
# only guarantees valid JSON syntax — it does not guarantee key conformance,
# so this cannot be enforced by prompt wording alone.
_ALLOWED_TOP_LEVEL_KEYS = {
    "schema_version",
    "automation_name",
    "automation_description",
    "required_integrations",
    "preview_json",
}

_REQUIRED_TOP_LEVEL_KEYS = _ALLOWED_TOP_LEVEL_KEYS  # all five are mandatory

# The ten universal operations from the prompt. Kept in code too so drift is
# caught and logged rather than silently trusted, same rationale as the
# top-level key check above.
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
    """
    Non-fatal compliance signal for the CRITICAL "approval/decision
    automations must branch" rule in SYSTEM_INSTRUCTION. This does NOT fix
    a miss - it only makes misses visible in logs instead of requiring a
    human to manually re-read every generated JSON, same rationale as every
    other _check_* function here.

    Fires a warning when automation_description contains approval/decision
    language (see _APPROVAL_LANGUAGE_KEYWORDS) but not a single step in the
    generated workflow carries a "condition" key. Deliberately a crude
    keyword match, not NLP - false positives (an automation that mentions
    "accept" in an unrelated sense) are acceptable noise; the goal is a
    hit-rate signal over many generations, not per-instance precision.
    """
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
    """
    Logs (does not block on) any workflow step whose "operation" isn't one of
    the ten universal verbs. Non-fatal: an odd operation value shouldn't 502
    the whole request, but should be visible so drift can be tracked the same
    way top-level key drift is tracked in _sanitize_workflow_output.
    """
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
        _check_depends_on(step, steps)
        _check_parallel_depends_on(step, steps)
        _check_condition_branch(step, steps)
        _check_ai_instructions(step)


def _check_service(step: dict) -> None:
    """
    Same non-fatal logging pattern as _check_operations/_check_target - logs
    when a step's "service" isn't one of the values actually in
    _valid_service_keys(). Doesn't block generation or touch preview_json;
    this is the visibility mechanism for catching prompt drift now that the
    whitelist is built from live catalog data instead of a static string -
    if this fires often for a real, well-known service name, it likely
    means the catalog itself is missing that entry (a data problem), not
    that Groq is misbehaving (a prompt problem) - worth distinguishing when
    triaging these logs.
    """
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
    Same non-fatal logging pattern as _check_operations, for the new
    "target" field. Doesn't touch preview_json - just visibility into
    prompt quality, checked before _enrich_with_real_operations runs.
    """
    if not isinstance(step, dict):
        return
    service = step.get("service")
    target = step.get("target")
    entry = get_service_entry(service) if service else None
    if not entry or entry.get("kind") != "action_node":
        return  # http_only / ai_subnode / trigger_only_or_unparsed / unmapped - target isn't meaningful here
    resources = entry.get("resources") or {}
    if not resources:
        return  # flat operation list (e.g. postgresql) - no target needed
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
    """
    Same non-fatal logging pattern as _check_target/_check_operations, for
    the new "instructions" field required on every "groq" step (see the
    GROQ / AI STEPS - INSTRUCTIONS section of SYSTEM_INSTRUCTION). Doesn't
    touch preview_json - just visibility into prompt quality.

    The length threshold is a crude heuristic (same rationale as the
    condition-key compliance check above: a cheap hit-rate signal, not
    precision) - "generate" or "summarize the data" would both slip past
    a bare non-empty check but are exactly the vague, un-groundable text
    the SYSTEM_INSTRUCTION rule exists to prevent.
    """
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
    """
    Same non-fatal logging pattern as _check_target/_check_service, for the
    new v4 "depends_on" field. Two things worth catching early, since a bad
    depends_on value silently breaks the future compile-time "wire this
    field to a previous step's output" UI rather than failing loudly:

      1. A referenced step number that doesn't exist in this workflow at
         all (Groq hallucinated a step number).
      2. A referenced step number >= this step's own number (a forward or
         self reference - "depends on" must point strictly backwards;
         nothing can depend on a step that hasn't run yet).

    Doesn't touch preview_json - visibility only, matching every other
    _check_* function in this file.
    """
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
    """
    Same non-fatal logging pattern as _check_depends_on. Flags the specific
    failure mode confirmed live: a step depending on an earlier step that
    uses the SAME service and operation (e.g. two independent "download a
    file" reads chained together instead of left parallel - see the
    DEPENDS_ON "specific trap" example in SYSTEM_INSTRUCTION). This isn't
    proof of a mistake - two same-service steps can legitimately depend on
    each other in rarer cases - but it's the exact structural shape the
    confirmed bug had, so it's worth a human glance rather than silence.
    """
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
            print(
                f"[workflow_generator] Step {this_step} depends_on step {ref} - "
                f"both use service '{service}' / operation '{operation}'. This is "
                f"the same shape as a confirmed bug (two independent reads spuriously "
                f"chained instead of left parallel) - verify step {this_step} genuinely "
                f"needs step {ref}'s output, not just that they're conceptually related."
            )


def _check_condition_branch(step: dict, all_steps: list) -> None:
    """
    Same non-fatal logging pattern, for the new v4 "condition"/"branch"
    keys. Checks:

      1. "condition.branches", if present, is a non-empty list of strings.
      2. "branch", if present on a step, matches one of the branch values
         declared by SOME earlier step's "condition" - a step claiming to
         run under a branch ("approved") that no earlier step's condition
         ever declared is a dangling reference the compiler can't resolve
         to an actual n8n IF/Switch output.

    Doesn't touch preview_json - visibility only.
    """
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


def _enrich_with_real_operations(preview_json: dict) -> dict:
    """
    THE fix for hardcoded operations. Runs once per generation, right after
    Groq returns and before the preview is stored or returned. For every
    step, looks up the real n8n resource/operation from node_registry.json
    and attaches it - the Preview Screen should display THIS, not the raw
    universal verb, so what the user approves is what will actually run.

    Adds two keys per step; never removes or renames the originals
    ("operation" and "target" stay exactly as Groq produced them - they
    remain the input here, and will remain the input to the future n8n
    compiler too):

        "n8n_resolved": true | false
        "n8n_operation": {"label", "value", "action", "description"} | null

    When resolution fails (ambiguous/missing target, no keyword match, or
    the service is http_only / ai_subnode / trigger_only_or_unparsed /
    unmapped in the registry), n8n_operation stays null and n8n_resolved is
    false - deliberately, not a bug. The Preview Screen is expected to show
    those steps with a "needs review" badge rather than presenting an
    unconfirmed operation as if it were resolved; a wrong silent guess here
    is worse than an honest gap, since it looks correct in the preview and
    only breaks later, at deploy time.
    """
    # Known root/sub-node pairing for ai_subnode services, confirmed against
    # n8n's own credentials docs (see conversation history for groq). Only
    # groq is populated for now - the registry doesn't currently store a
    # concrete n8n node type for its other 35 ai_subnode entries, so this
    # deliberately does NOT guess a node type for those; they fall back to
    # a "kind known, node type not yet mapped" shape instead of a wrong one.
    _AI_SUBNODE_CHAT_MODEL_TYPES = {
        "groq": "n8n-nodes-langchain.lmChatGroq",
    }
    _AI_AGENT_ROOT_NODE_TYPE = "n8n-nodes-langchain.agent"
    _AI_LANGUAGE_MODEL_CONNECTION_TYPE = "ai_languageModel"

    steps = preview_json.get("workflow", []) if isinstance(preview_json, dict) else []
    for step in steps:
        if not isinstance(step, dict):
            continue
        service = step.get("service")
        verb = step.get("operation")
        target = step.get("target") or None

        entry = get_service_entry(service) if service else None

        if entry and entry.get("kind") == "ai_subnode":
            # NOT a failure - n8n_resolved stays False deliberately, since
            # existing consumers (e.g. agent_router.py's "unresolved" list)
            # already key off this boolean for review-flagging, and this
            # patch is additive-only until that's confirmed safe to change.
            # n8n_resolution_kind is the new, unambiguous signal: the
            # compiler should check THIS field, not n8n_resolved, to tell
            # "genuinely broken" apart from "correctly an AI sub-node."
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            step["n8n_resolution_kind"] = "ai_subnode"
            step["n8n_subnode"] = {
                "root_node_type": _AI_AGENT_ROOT_NODE_TYPE,
                "connection_type": _AI_LANGUAGE_MODEL_CONNECTION_TYPE,
                "chat_model_node_type": _AI_SUBNODE_CHAT_MODEL_TYPES.get(
                    service
                ),  # None = not yet mapped for this provider
                # Resolved: SYSTEM_INSTRUCTION now requires Groq to populate
                # step["instructions"] directly on every groq step. The
                # compiler reads that field verbatim as the AI Agent node's
                # prompt/instructions text - no separate lookup needed.
                "agent_instructions_source": "step.instructions",
            }
            continue

        if entry and entry.get("kind") == "generic_http":
            # Same reasoning as ai_subnode: NOT a failure. n8n's HTTP Request
            # node has no resource/operation menu at all (confirmed against
            # n8n's own docs) - the universal verb maps to an HTTP method
            # instead. n8n_resolved stays False for the same backward-
            # compatibility reason as ai_subnode; n8n_resolution_kind is the
            # unambiguous signal for the compiler.
            method = resolve_http_method(verb)
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            step["n8n_resolution_kind"] = "generic_http"
            step["n8n_http_node"] = {
                "node_type": entry.get("node_type"),
                "method": method,  # None if this verb has no sensible REST mapping - needs a human look
            }
            continue

        if entry and entry.get("kind") == "http_only":
            # A real, known third-party service (has a credential in
            # integration_catalog.py) but no dedicated n8n node - reachable
            # ONLY via a generic HTTP Request node, same mechanically as
            # "generic_http", but kept as a distinct resolution_kind so the
            # compiler knows this needs THIS service's own auth/base-URL
            # details (from integration_catalog), not a truly generic call.
            method = resolve_http_method(verb)
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            step["n8n_resolution_kind"] = "http_only"
            step["n8n_http_node"] = {
                "node_type": "n8n-nodes-base.httpRequest",
                "method": method,  # None if this verb has no sensible REST mapping - needs a human look
            }
            continue

        if entry and entry.get("kind") == "trigger_only_or_unparsed":
            # Deliberately NOT given an automatic compile path, unlike the
            # three kinds above. This means the extractor found the node but
            # got zero operations from it - either it's a genuine trigger-
            # only node being used in a non-trigger step (a modeling problem
            # worth a human's attention, not a data gap to patch around), or
            # a legacy `name:'action'` property this version of the
            # extractor doesn't parse (see node_registry.py's own docstring -
            # FileMaker confirmed as one such case). Guessing which one
            # without checking risks silently accepting a broken step.
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            step["n8n_resolution_kind"] = "trigger_only_or_unparsed"
            continue

        if not entry:
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            step["n8n_resolution_kind"] = "unmapped"
            continue

        if entry.get("kind") != "action_node":
            # Should be unreachable now that ai_subnode / generic_http /
            # http_only / trigger_only_or_unparsed are all handled above -
            # kept as a safety net in case node_registry.json ever adds a
            # new `kind` value this function hasn't been taught yet, so that
            # case fails loudly as "unsupported_kind" instead of silently
            # falling through to resolve_operation with a kind it can't use.
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            step["n8n_resolution_kind"] = "unsupported_kind"
            continue

        op = resolve_operation(service, verb, resource=target)
        step["n8n_resolved"] = op is not None
        step["n8n_operation"] = op  # full dict or None - never a guessed partial value
        step["n8n_resolution_kind"] = (
            "action_node" if op is not None else "no_operation_match"
        )

    return preview_json


def _summarize_resolution(preview_json: dict) -> dict:
    """
    Small aggregate the /agents/extract-workflow response can hand straight
    to the frontend alongside integration status, so the Preview Screen
    doesn't need to loop every step client-side to know whether to show a
    "some steps need review" banner.

        {"total": 4, "resolved": 3, "unresolved_steps": [3]}
    """
    steps = preview_json.get("workflow", []) if isinstance(preview_json, dict) else []
    unresolved = [
        s.get("step")
        for s in steps
        if isinstance(s, dict) and not s.get("n8n_resolved")
    ]
    return {
        "total": len(steps),
        "resolved": len(steps) - len(unresolved),
        "unresolved_steps": unresolved,
    }


def _sanitize_workflow_output(raw: dict) -> dict:
    """
    Enforces the five-key output contract on a raw Groq response.

    - Drops any key not in _ALLOWED_TOP_LEVEL_KEYS (extra fields the model
      added despite being told not to).
    - Forces schema_version to CURRENT_SCHEMA_VERSION if missing or wrong,
      since a sanitized-but-unversioned document would otherwise look stale
      forever under the Problem 8 cache check.
    - Raises ValueError if a required key is missing entirely — this is a
      generation failure, not something safe to silently patch over, since
      there's no reliable way to reconstruct e.g. a missing preview_json.
    - Runs _check_operations/_check_target (logging only) and then
      _enrich_with_real_operations (mutates preview_json in place, adding
      n8n_resolved/n8n_operation per step) before returning.
    """
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
        # Not fatal — just stripped. Logged so drift frequency can be tracked
        # and the prompt/model choice revisited if this fires often.
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
        "schema_version": 4,
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
        the same service whitelist used for workflow steps (Rule 7). Required whenever
        "type" is Event, Email, or Form Submission, since those can be backed by more
        than one possible service (e.g. Email -> gmail vs outlook). For Manual, Schedule,
        Webhook, or API Call, set "service" to an empty string.

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

        Never invent an operation outside this list of ten, regardless of how
        unusual the service or action is.

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
        final logging step that always fires). A later step that depends on
        the fork should also set "depends_on" to include the step carrying
        the "condition".

        Worked example (illustration only) - note this is exactly the pattern
        the CRITICAL rule above requires whenever automation_description
        contains approval/decision language such as "approval requests" or
        "based on the manager's decision":

        {
        "step": 3,
        "service": "gmail",
        "operation": "read",
        "target": "message",
        "parameters": {},
        "depends_on": [],
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

    # SYSTEM_INSTRUCTION is a plain (non-f) string because it contains literal
    # { } in the JSON schema example - substituting the one dynamic piece via
    # .replace() on a unique placeholder avoids having to escape every other
    # brace in the string as an f-string would require.
    system_instruction = SYSTEM_INSTRUCTION.replace(
        "{SERVICE_WHITELIST}", _service_whitelist_text()
    )

    print("Groq")
    raw_workflow = await generate_workflow_from_prompt(user_content, system_instruction)
    result = _sanitize_workflow_output(raw_workflow)
    print("SANITIZED KEYS:", sorted(result.keys()))  # <-- add this
    return result
    return _sanitize_workflow_output(raw_workflow)


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
