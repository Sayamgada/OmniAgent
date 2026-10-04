"""
app/compiler/bindings.py  (Stage 3.4)

Upstream-data bindings for the param form: lets a field take its value from
earlier in the workflow instead of a fixed typed value -- e.g. a reply's
recipient = the sender of the email that triggered the workflow.

Expressions use NAMED node references ($('<node>').first().json.<field>) rather
than $json, so they work from any position in the graph (after a Switch, after
other nodes). n8n only evaluates {{ }} when the parameter value starts with "=".

UNVALIDATED n8n details live ONLY in the constants below. If a live run shows
a different field name, edit that one line:
  - GMAIL_TRIGGER_FIELDS: output field names of the Gmail Trigger node
    (assumed simplified output: From / Subject). Verify against a real
    trigger test event.
  - AI_OUTPUT_FIELD: validated in Stage 3.3 (the agent's text is $json.output).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .models import ResolvedNode, Step

# --- unvalidated / tunable n8n details --------------------------------------
GMAIL_TRIGGER_TYPE = "n8n-nodes-base.gmailTrigger"
GMAIL_TRIGGER_FIELDS = {"sender": "From", "subject": "Subject"}
AI_OUTPUT_FIELD = "output"

# Parameter names (per param_schema) that these bindings can fill.
RECIPIENT_FIELDS = {"sendTo"}
SUBJECT_FIELDS = {"subject"}
BODY_FIELDS = {"message", "text", "body", "content"}


@dataclass
class Binding:
    source: str  # "trigger" | "ai_output"
    label: str  # shown in the UI chip
    expression: str  # the exact parameter value, starting with "="
    default: bool  # pre-applied when the form first renders


def node_ref(node_name: str, field: str) -> str:
    """$('<node>').first().json.<field>, with the node name safely quoted."""
    safe = node_name.replace("\\", "\\\\").replace("'", "\\'")
    return f"$('{safe}').first().json.{field}"


def _ancestors(step_no: int, steps_by_num: dict[int, Step]) -> set[int]:
    seen: set[int] = set()
    stack = list(steps_by_num[step_no].depends_on)
    while stack:
        n = stack.pop()
        if n in seen or n not in steps_by_num:
            continue
        seen.add(n)
        stack.extend(steps_by_num[n].depends_on)
    return seen


def compute_bindings(
    step: Step,
    steps_by_num: dict[int, Step],
    resolved_by_step: dict[int, ResolvedNode],
    field_names: list[str],
) -> dict[str, list[Binding]]:
    """field name -> bindings offered for it (only fields that have any)."""
    anc = _ancestors(step.step, steps_by_num)

    trigger: Optional[ResolvedNode] = next(
        (resolved_by_step[n] for n in sorted(anc) if steps_by_num[n].is_trigger),
        None,
    )
    trigger_is_gmail = (
        trigger is not None
        and trigger.node_type == GMAIL_TRIGGER_TYPE
        and bool(trigger.name)
    )

    agent_steps = [n for n in anc if resolved_by_step[n].kind == "agent_root"]
    agent_no = max(agent_steps) if agent_steps else None  # nearest upstream agent
    agent = resolved_by_step[agent_no] if agent_no is not None else None
    # A routing agent (condition.branches) answers with a decision, not content,
    # so its output is offered for body fields but never pre-applied.
    agent_is_router = agent_no is not None and bool(steps_by_num[agent_no].condition)

    out: dict[str, list[Binding]] = {}
    for name in field_names:
        found: list[Binding] = []
        if name in RECIPIENT_FIELDS and trigger_is_gmail:
            ref = node_ref(trigger.name, GMAIL_TRIGGER_FIELDS["sender"])
            found.append(
                Binding(
                    "trigger", "Sender of the trigger email", f"={{{{ {ref} }}}}", True
                )
            )
        elif name in SUBJECT_FIELDS and trigger_is_gmail:
            ref = node_ref(trigger.name, GMAIL_TRIGGER_FIELDS["subject"])
            found.append(
                Binding(
                    "trigger", "Re: original subject", f"=Re: {{{{ {ref} }}}}", True
                )
            )
        elif name in BODY_FIELDS and agent is not None and agent.name:
            ref = node_ref(agent.name, AI_OUTPUT_FIELD)
            found.append(
                Binding(
                    "ai_output",
                    "AI agent output",
                    f"={{{{ {ref} }}}}",
                    not agent_is_router,
                )
            )
        if found:
            out[name] = found
    return out
