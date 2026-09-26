"""
Step 10 (early stub) — Layout.

Trivial version for the vertical slice: linear left-to-right placement by
step order, with ai_subnode nodes offset below their cluster head. The
real layered/topological layout (Step 10 in the full plan) replaces this
function's body only — callers don't change.

Deliberately NOT using dagre: it's a JS library and this backend is
Python. n8n only needs an [x, y] pair per node, so a from-scratch layered
layout in Python (topological layer = x, index-in-layer = y) covers the
same need without a Node subprocess dependency.

Post-realignment note: the primary AI path (a Groq/etc. step) now
resolves as a top-level "agent_root" node, not "ai_subnode" — it sits in
the ordinary main chain and gets a normal main_index position like any
other step (matches compile.py, which reads positions[step.step] for the
agent_root itself and offsets its chat-model subnode inline, since
subnodes have no step number of their own to key a position by). The
ai_subnode branch below is dead for that path now; it's kept only as a
defensive fallback for the still-deferred multi_node_hub AI path
(instantiate.py's _instantiate_multi_node_hub), which can still produce a
bare top-level ai_subnode node wired via depends_on.
"""

from __future__ import annotations

from .models import ResolvedNode, Step

X_SPACING = 280
Y_SPACING = 180
AI_Y_OFFSET = 220


def layout_positions(
    steps: list[Step], resolved_by_step: dict[int, ResolvedNode]
) -> dict[int, list[float]]:
    positions: dict[int, list[float]] = {}
    main_index = 0
    for step in sorted(steps, key=lambda s: s.step):
        resolved = resolved_by_step[step.step]
        if resolved.kind == "ai_subnode":
            continue  # positioned relative to its head, below
        positions[step.step] = [main_index * X_SPACING, 300]
        main_index += 1

    for step in steps:
        resolved = resolved_by_step[step.step]
        if resolved.kind != "ai_subnode":
            continue
        head_num = step.depends_on[0] if step.depends_on else None
        head_pos = positions.get(head_num, [0, 300])
        positions[step.step] = [head_pos[0], head_pos[1] + AI_Y_OFFSET]

    return positions
