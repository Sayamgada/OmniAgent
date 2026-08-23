from functools import lru_cache

from app.models.automation_preview_model import automation_preview_collection
from app.services.llm_service import generate_workflow_from_prompt
from app.core.n8n_operation_registry import get_service_entry, resolve_operation
from app.core.integration_catalog import INTEGRATION_CATALOG

# Service keys the catalog carries for generic/abstract auth mechanisms, not
# real external services (e.g. the raw "give me a header auth credential"
# base types some services build on). These have no place in a workflow
# step's "service" field - excluding them here rather than in the catalog
# itself, since integration_catalog.py may still need them as valid
# n8n_credential_type owners for OTHER services' auth_options.
_EXCLUDED_SERVICE_KEYS = {
    "http_basic_auth", "http_digest_auth", "http_header_auth", "http_query_auth",
    "http_custom_auth", "http_ssl_auth", "http_multiple_headers_auth",
    "http_templated_custom_auth", "o_auth1_api", "o_auth2_api",
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

CURRENT_SCHEMA_VERSION = 3
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
# A v2-cached Mongo document has none of these keys, so the version bump is
# required for the existing stale-cache regeneration check in
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
    "create", "read", "update", "delete", "list",
    "send", "search", "generate", "upload", "download",
}


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
    steps = preview_json.get("workflow", []) if isinstance(preview_json, dict) else []
    for step in steps:
        if not isinstance(step, dict):
            continue
        service = step.get("service")
        verb = step.get("operation")
        target = step.get("target") or None

        entry = get_service_entry(service) if service else None
        if not entry or entry.get("kind") != "action_node":
            step["n8n_resolved"] = False
            step["n8n_operation"] = None
            continue

        op = resolve_operation(service, verb, resource=target)
        step["n8n_resolved"] = op is not None
        step["n8n_operation"] = op  # full dict or None - never a guessed partial value

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
    unresolved = [s.get("step") for s in steps if isinstance(s, dict) and not s.get("n8n_resolved")]
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
        print(f"[workflow_generator] Stripped non-conforming keys from Groq output: {sorted(dropped)}")

    sanitized = {key: raw[key] for key in _ALLOWED_TOP_LEVEL_KEYS}
    sanitized["schema_version"] = CURRENT_SCHEMA_VERSION
    _check_operations(sanitized.get("preview_json", {}))
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
        "schema_version": 3,
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
                "parameters": {}
            }
            ],

            "output": ""
        }
        }

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
        "target": "",
        "parameters": { "sheet_id": "" }
        }

        In the second example, "sheet_id" is structural (which sheet to write to) -
        not runtime content, and "target" is left empty since Google Sheets' update
        step has no ambiguity about what kind of object is being updated.
        If the automation does not name a specific sheet, document, folder, or
        table, leave "parameters" as {}.

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
    raw_workflow = await generate_workflow_from_prompt(
        user_content,
        system_instruction
    )
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