"""
Stage 4/6 — Connection graph.

Turns `depends_on` into real `main` connections (fan-in/fan-out), wires
agent_root steps to their chat-model (etc.) subnode(s) under
`ai_languageModel`, and (once branching is added in a later step) will
synthesize Switch/Merge nodes.

Realigned per omniagent_compiler_realignment_plan.md: the AI cluster
wiring direction was backwards in the first draft. It is NOT
"ai_subnode step -> its depends_on head, via ai_languageModel". The real
shape is: an ai_subnode step resolves (instantiate.py) to an agent_root
node that sits in the ordinary main chain like any other step, and its
chat-model subnode is wired FROM the subnode INTO the agent_root via
ai_languageModel, sourced from resolved.subnodes -- never from
depends_on, since the subnode belongs to the same step as its parent.

Fan-in synthesis (Merge nodes) and Switch/branch synthesis are still not
implemented in this vertical slice, flagged with a TODO and a warning
rather than silently producing wrong output.
"""

from __future__ import annotations

from .models import CompileReport, N8nConnection, ResolvedNode, Step


def build_connections(
    steps: list[Step],
    resolved_by_step: dict[int, ResolvedNode],
    report: CompileReport,
) -> list[N8nConnection]:
    connections: list[N8nConnection] = []
    by_step = {s.step: s for s in steps}

    for step in steps:
        resolved = resolved_by_step[step.step]

        # Subnode -> agent_root wiring, sourced from the resolved node's
        # own subnodes list (same step), independent of depends_on.
        for sub in resolved.subnodes:
            connections.append(
                N8nConnection(
                    source_name=sub.name,
                    source_output=sub.ai_connection_type or "ai_languageModel",
                    source_index=0,
                    target_name=resolved.name,
                    target_input=sub.ai_connection_type or "ai_languageModel",
                    target_index=0,
                )
            )

        if resolved.kind == "ai_subnode":
            # A bare chat-model/etc. node never appears at top level of
            # resolved_by_step under the realigned instantiate.py (it only
            # ever shows up inside another step's .subnodes), but guard
            # here anyway: it has no main connections either way.
            continue

        # agent_root behaves like any other main-chain node for incoming/
        # outgoing `main` wiring -- it's the step's own reasoning node, not
        # a leaf. Trigger (step 0) is included here too, since loader.py
        # gives it a normal ResolvedNode via the synthetic step.
        incoming = [d for d in step.depends_on if by_step.get(d) is not None]
        if len(incoming) > 1:
            report.warnings.append(
                f"step {step.step} ({step.service}) has {len(incoming)} incoming "
                "dependencies; fan-in Merge synthesis not yet implemented in this "
                "slice — wiring from the first dependency only."
            )
            incoming = incoming[:1]

        for dep_num in incoming:
            dep_resolved = resolved_by_step.get(dep_num)
            if dep_resolved is None or dep_resolved.kind == "ai_subnode":
                continue
            connections.append(
                N8nConnection(
                    source_name=dep_resolved.name,
                    source_output="main",
                    source_index=0,
                    target_name=resolved.name,
                    target_input="main",
                    target_index=0,
                )
            )

    return connections
