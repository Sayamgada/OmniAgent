"""
Converts a preview_json (the Groq output contract shape) into Step
objects the compiler understands.

Resource inference (mapping Groq's free-text `action` to an n8n
`resource` like "message") isn't decided yet — it's adjacent to the
`no_operation_match` open question, not solved by this loader. For now,
callers may pass `resource_hints` (step number -> resource) explicitly;
production wiring should decide this alongside Step 8's disambiguation
work rather than guessing silently here.
"""

from __future__ import annotations

from typing import Any, Optional

from .models import Step


def preview_to_steps(
    preview_json: dict[str, Any],
    resource_hints: Optional[dict[int, str]] = None,
) -> list[Step]:
    resource_hints = resource_hints or {}
    raw_steps = preview_json["preview_json"]["workflow"]

    steps: list[Step] = []
    for i, raw in enumerate(raw_steps):
        step_num = raw["step"]
        steps.append(
            Step(
                step=step_num,
                service=raw["service"],
                action=raw["action"],
                resource=resource_hints.get(step_num),
                depends_on=[raw_steps[i - 1]["step"]] if i > 0 else [],
                is_trigger=(i == 0),
                raw=raw,
            )
        )
    return steps
