"""
app/compiler/resolve.py

Factored out of compile.py: resolving every Step against the registry is
needed in TWO places now, not one --

1. compile() itself (as before)
2. the param-schema lookup (new) -- the endpoint the frontend calls right
   when the user clicks "Create Workflow" needs to know each step's
   resolved node_type/type_version/resource/operation BEFORE any
   parameters exist, purely to know which fields to render in the form.

Both need the exact same resolution logic, so it lives here once instead
of being duplicated (or silently drifting) between the two callers.
"""

from __future__ import annotations

from .instantiate import instantiate_step
from .models import CompileReport, ResolvedNode, Step, UnresolvedStep


def resolve_all_steps(
    steps: list[Step],
) -> tuple[dict[int, ResolvedNode], CompileReport]:
    """
    Resolves every step and collects any no_operation_match cases into a
    report. Callers (compile(), the param-schema endpoint) both stop and
    surface report.needs_user_input before going further if
    not report.is_deployable -- neither should ever proceed past a step
    that couldn't be resolved.
    """
    report = CompileReport()
    used_names: set[str] = set()

    # Step numbers that an AI step ITSELF depends_on -- i.e. steps the
    # agent calls as a tool mid-reasoning. This is the opposite direction
    # from "steps that depend on the AI step" (that's just the normal
    # downstream main chain, e.g. "send the drafted reply" -- not a tool
    # call). Confirmed as a real, previously-latent bug: the first typed
    # version of this set checked the wrong direction and incorrectly
    # resolved a plain downstream Gmail Send as the gmailHitlTool variant
    # whenever it depended_on the AI step, which is the common case, not
    # the exception.
    ai_tool_steps: set[int] = set()
    for s in steps:
        if s.n8n_resolution_kind == "ai_subnode":
            ai_tool_steps.update(s.depends_on)

    resolved_by_step: dict[int, ResolvedNode] = {}
    for step in steps:
        resolved_by_step[step.step] = instantiate_step(step, used_names, ai_tool_steps)

    for step in steps:
        resolved = resolved_by_step[step.step]
        if resolved.kind == "no_operation_match":
            report.needs_user_input.append(
                UnresolvedStep(
                    step=step.step,
                    service=step.service,
                    reason="ambiguous or unresolvable operation — pick one",
                    candidates=resolved.candidates,
                )
            )

    return resolved_by_step, report
