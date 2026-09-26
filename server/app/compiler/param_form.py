"""
app/compiler/param_form.py

The piece that answers "what form do we show the user when they click
Create Workflow?" -- resolves every step, then for each one that maps to
a real node, asks param_schema.py what fields are required.

ADAPT BEFORE WIRING INTO A ROUTER: this operates on already-loaded Step
objects, not a preview_id -- the actual endpoint (in agent_router.py,
not built here since its real shape wasn't available) needs to:
  1. look up the stored preview by id (via whatever
     automation_preview_service.py / the Mongo model actually exposes)
  2. call loader.preview_to_steps() on it (same as print_workflow.py does)
  3. call build_param_form(steps) below
  4. return the result as the endpoint's response body

Only step 3 is built here -- steps 1/2/4 depend on files not yet shared.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

from .models import Step
from .param_schema import FieldDef, get_required_params
from .resolve import resolve_all_steps


@dataclass
class StepParamForm:
    step: int
    service: str
    display_label: str  # human-readable, e.g. "Gmail — Send a message"
    fields: list[FieldDef]


@dataclass
class ParamFormResult:
    is_ready: bool  # False if any step still needs disambiguation first
    unresolved_steps: list[
        dict
    ]  # same shape as CompileReport.needs_user_input, for the UI
    forms: list[StepParamForm]


def build_param_form(steps: list[Step]) -> ParamFormResult:
    resolved_by_step, report = resolve_all_steps(steps)

    if not report.is_deployable:
        return ParamFormResult(
            is_ready=False,
            unresolved_steps=[asdict(u) for u in report.needs_user_input],
            forms=[],
        )

    forms: list[StepParamForm] = []
    for step in steps:
        resolved = resolved_by_step[step.step]
        if resolved.kind in ("ai_subnode", "agent_root"):
            # agent_root: the AI Agent node itself (primary path, per the
            # realignment) and its chat-model subnode take their config from
            # step.instructions / server-resolved credentials, not a param
            # form. ai_subnode: kept for the deferred multi_node_hub
            # fallback path, which can still produce a bare top-level
            # ai_subnode node. Neither has anything to render here.
            # AI subnode credentials (the API key) are handled by the
            # credential checker, not a per-step parameter form -- the
            # prompt/instructions text is supplied earlier, at generation
            # time, not here. Nothing to render for these steps.
            continue
        if resolved.node_type is None or resolved.type_version is None:
            continue

        fields = get_required_params(
            resolved.node_type, resolved.type_version, step.target, step.operation
        )
        if not fields:
            continue  # nothing to ask the user for this step

        forms.append(
            StepParamForm(
                step=step.step,
                service=step.service,
                display_label=f"{resolved.name} — {step.n8n_operation.get('action') if step.n8n_operation else step.operation or ''}",
                fields=fields,
            )
        )

    return ParamFormResult(is_ready=True, unresolved_steps=[], forms=forms)
