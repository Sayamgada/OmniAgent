# app/utils/trigger_registry.py
"""
Trigger Registry — maps a generated preview_json.trigger to a concrete n8n
trigger node.

Background (Report Problem 2): the Groq output contract constrains
trigger.type to seven values (Manual, Schedule, Webhook, Event, Email, Form
Submission, API Call), but the compiler's registry originally only had
mappings for three of them. Four types had no defined n8n node, meaning
those workflows could not be compiled at all.

Three of the seven types resolve unambiguously to a single n8n node
(Manual, Schedule, Webhook). The other four are either genuinely
service-agnostic (Event, API Call) or resolve differently depending on
which external service backs the trigger (Email, Form Submission) — e.g.
an Email trigger could mean Gmail or Outlook, which are different n8n
nodes with different credential types.

This is exactly why trigger.service was added to the IR schema
(workflow_generator.py) alongside trigger.type: it gives this registry
something concrete to branch on instead of parsing the free-text
trigger.description, which is not reliable input for a deterministic
compiler step.
"""

from typing import TypedDict


class TriggerTarget(TypedDict):
    n8n_node_type: str
    notes: str


# Trigger types that resolve to exactly one n8n node regardless of service.
_UNAMBIGUOUS_TRIGGERS: dict[str, TriggerTarget] = {
    "Manual": {
        "n8n_node_type": "n8n-nodes-base.manualTrigger",
        "notes": "No service-specific branching needed.",
    },
    "Schedule": {
        "n8n_node_type": "n8n-nodes-base.scheduleTrigger",
        "notes": "No service-specific branching needed.",
    },
    "Webhook": {
        "n8n_node_type": "n8n-nodes-base.webhook",
        "notes": "No service-specific branching needed.",
    },
    "API Call": {
        "n8n_node_type": "n8n-nodes-base.webhook",
        "notes": (
            "n8n has no separate 'API call' trigger concept — an inbound API "
            "call is modeled as a webhook. Same node as Webhook, kept as a "
            "distinct IR trigger.type only because it's a distinct concept "
            "from the user's point of view when describing the automation."
        ),
    },
}

# Event is service-agnostic at the n8n-node level UNLESS the source service
# has a native event trigger node — those overrides live here, keyed by
# trigger.service. A service with no entry here falls back to the generic
# webhook-based event trigger.
_EVENT_SERVICE_OVERRIDES: dict[str, TriggerTarget] = {
    "airtable": {
        "n8n_node_type": "n8n-nodes-base.airtableTrigger",
        "notes": "Airtable has a native row-created/updated trigger node.",
    },
    "google_sheets": {
        "n8n_node_type": "n8n-nodes-base.googleSheetsTrigger",
        "notes": "Native sheet-change trigger node.",
    },
    # Add further native event-trigger nodes here as they're confirmed to
    # exist in n8n. Any service NOT listed here falls back to the generic
    # webhook trigger below, which is always a safe default.
}

_EVENT_DEFAULT: TriggerTarget = {
    "n8n_node_type": "n8n-nodes-base.webhook",
    "notes": (
        "Generic fallback for Event triggers whose service has no native "
        "n8n event-trigger node. The source service must be configured to "
        "POST to this webhook on the relevant event."
    ),
}

# Email trigger branches on which email service backs it.
_EMAIL_SERVICE_TARGETS: dict[str, TriggerTarget] = {
    "gmail": {
        "n8n_node_type": "n8n-nodes-base.gmailTrigger",
        "notes": "Native Gmail polling/push trigger.",
    },
    "outlook": {
        "n8n_node_type": "n8n-nodes-base.microsoftOutlookTrigger",
        "notes": "Native Outlook trigger.",
    },
    # Fallback for any other/unlisted email service: generic IMAP polling.
    "_default": {
        "n8n_node_type": "n8n-nodes-base.emailReadImap",
        "notes": "Generic IMAP trigger for email services without a dedicated n8n node.",
    },
}

# Form Submission trigger branches on which form service backs it.
_FORM_SERVICE_TARGETS: dict[str, TriggerTarget] = {
    "typeform": {
        "n8n_node_type": "n8n-nodes-base.typeformTrigger",
        "notes": "Native Typeform trigger.",
    },
    "google_forms": {
        "n8n_node_type": "n8n-nodes-base.googleFormsTrigger",
        "notes": "Native Google Forms trigger, if available in the installed n8n version.",
    },
    "jotform": {
        "n8n_node_type": "n8n-nodes-base.jotFormTrigger",
        "notes": "Native JotForm trigger.",
    },
    # Fallback for any other/unlisted form service: generic form trigger.
    "_default": {
        "n8n_node_type": "n8n-nodes-base.formTrigger",
        "notes": "Generic n8n form trigger for form services without a dedicated node.",
    },
}


def resolve_trigger_target(trigger_type: str, trigger_service: str) -> TriggerTarget:
    """
    Resolves a preview_json.trigger object to a concrete n8n trigger node.

    trigger_service should be "" for trigger types that don't need it
    (Manual, Schedule, Webhook, API Call) — matching the IR schema rule in
    workflow_generator.py that only sets trigger.service for Event, Email,
    and Form Submission.

    Raises ValueError for an unrecognized trigger_type — this should never
    happen for output that passed generation-time validation, so treat it
    as a genuine data-integrity error, not something to guess around.
    """
    if trigger_type in _UNAMBIGUOUS_TRIGGERS:
        return _UNAMBIGUOUS_TRIGGERS[trigger_type]

    if trigger_type == "Event":
        return _EVENT_SERVICE_OVERRIDES.get(trigger_service, _EVENT_DEFAULT)

    if trigger_type == "Email":
        return _EMAIL_SERVICE_TARGETS.get(
            trigger_service, _EMAIL_SERVICE_TARGETS["_default"]
        )

    if trigger_type == "Form Submission":
        return _FORM_SERVICE_TARGETS.get(
            trigger_service, _FORM_SERVICE_TARGETS["_default"]
        )

    raise ValueError(f"Unrecognized trigger.type: '{trigger_type}'")