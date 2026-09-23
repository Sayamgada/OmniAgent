"""
Stage 4/6 — Connection graph.

Turns `depends_on` into real `main` connections (fan-in/fan-out), wires
ai_subnode steps to their cluster head under `ai_languageModel`, and (once
branching is added in a later step) will synthesize Switch/Merge nodes.

For now this covers: linear chains, simple fan-out, and AI-subnode wiring.
Fan-in synthesis (Merge nodes) and Switch/branch synthesis are Step 6/7 —
not implemented in this vertical slice, flagged with a TODO and a warning
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

        if resolved.kind == "ai_subnode":
            # Subnode -> root, per the AI cluster wiring rule.
            for dep_num in step.depends_on:
                head = resolved_by_step.get(dep_num)
                if head is None:
                    continue
                connections.append(
                    N8nConnection(
                        source_name=resolved.name,
                        source_output=resolved.ai_connection_type or "ai_languageModel",
                        source_index=0,
                        target_name=head.name,
                        target_input=resolved.ai_connection_type or "ai_languageModel",
                        target_index=0,
                    )
                )
            continue  # ai_subnode never has outgoing `main` connections

        incoming = [d for d in step.depends_on if by_step.get(d)]
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
