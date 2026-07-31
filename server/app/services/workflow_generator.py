from app.models.automation_preview_model import automation_preview_collection
from app.services.llm_service import generate_workflow_from_prompt

CURRENT_SCHEMA_VERSION = 2

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
        "schema_version": 2,
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
        use "llm" or "gemini" as the service value; the only valid AI service value
        today is "groq".

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
        parameters

        SERVICE

        The "service" field MUST use one of the values below, grouped by category.
        Do NOT invent service names. If nothing fits, use "http" for a generic REST
        call or "webhook" for a generic incoming trigger, and set the corresponding
        required_integrations[].display_name to the real external system's name.

        AI
        groq

        Communication
        gmail, outlook, smtp_email, slack, microsoft_teams, discord, telegram, twilio_sms, whatsapp

        Productivity
        google_calendar, outlook_calendar, google_contacts, google_tasks, notion, trello, asana, clickup, monday, todoist

        Cloud Storage
        drive, dropbox, onedrive, box, amazon_s3, ftp_sftp

        Databases
        postgresql, mysql, mongodb, redis, sqlite, supabase, airtable, firebase

        Documents
        google_docs, google_sheets, microsoft_excel_online, microsoft_word_online, confluence, gitbook

        Developer Tools
        github, gitlab, bitbucket, jira, jenkins, azure_devops, docker

        CRM & Sales
        salesforce, hubspot, zoho_crm, pipedrive, freshsales

        Finance & Payments
        stripe, razorpay, paypal, quickbooks, xero

        Social Media
        x_twitter, linkedin, facebook, instagram_business, youtube, reddit, pinterest

        Forms
        google_forms, typeform, jotform, tally, formstack

        Search & Web
        http, graphql, webhook, rss_feed, serpapi, tavily, brave_search, google_custom_search

        Maps & Utilities
        google_maps, mapbox, openweather, weatherapi

        Authentication
        auth0, clerk, firebase_authentication, keycloak, okta

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
        or generated is conveyed by "automation_description", the step's position
        in the workflow, and "parameters" - not by inventing a longer operation
        name.

        Examples (illustrating the PATTERN only):
        - Drafting or summarizing text with the AI provider -> "generate"
        - Sending an email or a Slack message -> "send"
        - Creating a calendar event, a Notion page, or a database row -> "create"
        - Looking something up or querying a database -> "read" or "search"
        - Attaching or storing a file -> "upload"

        Never invent an operation outside this list of ten, regardless of how
        unusual the service or action is.

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
        "parameters": {}
        }

        {
        "step": 2,
        "service": "google_sheets",
        "operation": "update",
        "parameters": { "sheet_id": "" }
        }

        In the second example, "sheet_id" is structural (which sheet to write to) -
        not runtime content. If the automation does not name a specific sheet,
        document, folder, or table, leave "parameters" as {}.

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

    print("Groq")
    raw_workflow = await generate_workflow_from_prompt(
        user_content,
        SYSTEM_INSTRUCTION
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