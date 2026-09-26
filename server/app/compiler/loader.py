"""
Converts a real preview_json (the ENRICHED Groq output contract — see
workflow_generator.py's _enrich_with_real_operations/_enrich_trigger) into
Step objects the compiler understands.

Realigned per omniagent_compiler_realignment_plan.md §1a/§2:

- The trigger is NOT workflow[]'s step 1. It's a separate top-level object
  (preview_json["trigger"]) already resolved server-side to a real node
  type via `n8n_trigger_resolved` / `n8n_trigger_node`. This loader turns
  it into a synthetic step 0, so graph.py's existing depends_on-driven
  wiring needs no change to treat it as a valid connection source.
- Every workflow[] step already carries its own resolution
  (`n8n_resolution_kind`, `n8n_operation`, `n8n_subnode`, `n8n_http_node`)
  from server-side enrichment. This loader passes those straight through
  rather than re-deriving anything — resolution/disambiguation logic
  belongs in instantiate.py, not here.
- `resource_hints` is gone: `target` arrives already resolved from Groq,
  there is nothing left to hint.
"""

from __future__ import annotations

from typing import Any

from .models import Step


def _build_trigger_step(preview_json: dict[str, Any]) -> Step | None:
    trigger = preview_json.get("preview_json", {}).get("trigger")
    if not trigger:
        return None

    trigger_resolved = bool(trigger.get("n8n_trigger_resolved"))
    trigger_node = trigger.get("n8n_trigger_node")
    kind = (
        "action_node" if (trigger_resolved and trigger_node) else "no_operation_match"
    )

    return Step(
        step=0,
        service=trigger.get("service") or "",
        depends_on=[],
        is_trigger=True,
        n8n_resolution_kind=kind,
        n8n_trigger_node=trigger_node,
        raw=trigger,
    )


def preview_to_steps(preview_json: dict[str, Any]) -> list[Step]:
    preview = preview_json["preview_json"]
    raw_steps = preview.get("workflow", [])

    trigger_step = _build_trigger_step(preview_json)

    steps: list[Step] = []
    if trigger_step is not None:
        steps.append(trigger_step)

    for raw in raw_steps:
        depends_on = list(raw.get("depends_on") or [])
        if not depends_on and trigger_step is not None:
            # An empty depends_on means "only needs the trigger data" per
            # the prompt's own framing — wire it to the synthetic trigger
            # step rather than leaving it a disconnected root.
            depends_on = [0]

        condition_raw = raw.get("condition")
        condition = None
        if isinstance(condition_raw, dict) and "branches" in condition_raw:
            from .models import ConditionBranch

            condition = [
                ConditionBranch(
                    label=b.get("label", ""), expression=b.get("expression", "")
                )
                for b in condition_raw.get("branches", [])
            ]

        steps.append(
            Step(
                step=raw["step"],
                service=raw["service"],
                operation=raw.get("operation"),
                target=raw.get("target") or None,
                depends_on=depends_on,
                condition=condition,
                branch=raw.get("branch"),
                instructions=raw.get("instructions"),
                is_trigger=False,
                n8n_resolution_kind=raw.get("n8n_resolution_kind"),
                n8n_operation=raw.get("n8n_operation"),
                n8n_subnode=raw.get("n8n_subnode"),
                n8n_http_node=raw.get("n8n_http_node"),
                raw=raw,
            )
        )
    return steps
