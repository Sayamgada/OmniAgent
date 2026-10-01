"""
Stage 4/6 — Connection graph.

Turns `depends_on` into real `main` connections (fan-in/fan-out), wires
agent_root steps to their chat-model (etc.) subnode(s) under
`ai_languageModel`, synthesizes a real Merge node for any step with 2+
resolved incoming dependencies (fan-in), and now synthesizes a real
Switch node for any step carrying `condition` (branching), routing each
declared-branch dependent through the correct Switch output index.

Realigned per omniagent_compiler_realignment_plan.md: the AI cluster
wiring direction was backwards in the first draft. It is NOT
"ai_subnode step -> its depends_on head, via ai_languageModel". The real
shape is: an ai_subnode step resolves (instantiate.py) to an agent_root
node that sits in the ordinary main chain like any other step, and its
chat-model subnode is wired FROM the subnode INTO the agent_root via
ai_languageModel, sourced from resolved.subnodes -- never from
depends_on, since the subnode belongs to the same step as its parent.

FAN-IN (Merge synthesis)
------------------------------------------------------------------------
A step with 2+ resolved, non-ai_subnode, non-branch-routed incoming
dependencies gets one synthesized Merge node inserted upstream of it:
each dependency wires into a distinct Merge input (index order = the
step's own depends_on order), and the Merge's single main output wires
into the step. .step on the synthesized node = the step it feeds
(layout_hint="before_step" — it sits upstream of that position).

BRANCHING (Switch synthesis)
------------------------------------------------------------------------
A step carrying `condition` (a non-empty list of ConditionBranch, in the
order the loader gave it -- see loader.py's real-shape note) gets one
synthesized Switch node wired downstream of it: the branching step's own
main output feeds the Switch's single main input, and the Switch gets
one output per branch, in `condition` order (index = position in that
list -- this IS the routing key, not the label). .step on the
synthesized node = the branching step itself (layout_hint="after_step"
— it sits downstream of that position, opposite of Merge).

Any OTHER step that `depends_on` a branching step AND declares a
matching `branch` label is rerouted: instead of wiring directly from the
branching step, it wires from the Switch's output at that label's index.
A step depending on a branching step WITHOUT a `branch` label (or with
one that doesn't match any of that step's condition labels) is NOT
silently guessed at — it logs a warning and falls back to the old direct
wiring, same needs-review-not-a-guess philosophy as resolve_operation().

Placeholder condition/rule content (Switch's `fixed_params`) mirrors
n8n's own documented default for a blank Routing Rule (confirmed via
nodes.json's `rules` property `default` key) rather than inventing a
shape -- real condition expressions are still deferred, same as every
other step's real parameters.

Both synthesis paths fall back to the pre-existing "warn and wire
directly" behavior if the registry has no matching utility-node entry
yet (e.g. generated_registry.json predates the utility-node module) --
never crashes.
"""

from __future__ import annotations

from ..core.n8n_operation_registry import get_utility_node
from .models import CompileReport, N8nConnection, ResolvedNode, Step

# ---------------------------------------------------------------------------
# Aggregate synthesis (Stage 3.2). UNVALIDATED against live n8n until the
# hand-built Trigger -> Code -> Aggregate -> AI Agent check is done -- if the
# exported node differs, edit ONLY this constant.
# ---------------------------------------------------------------------------
AGGREGATE_FIXED_PARAMS: dict = {
    "aggregate": "aggregateAllItemData",
    "destinationFieldName": "data",
}


def aggregate_node_name(step_num: int) -> str:
    """Single source of truth for the synthesized Aggregate's name, so
    compile.py can detect it by name without a second predicate."""
    return f"Aggregate (step {step_num})"


def agent_needs_aggregate(
    step: Step,
    by_step: dict[int, Step],
    resolved_by_step: dict[int, ResolvedNode],
) -> bool:
    """True when an agent_root step has at least one real (non-trigger,
    non-subnode) upstream dependency. Trigger-only agents stay per-item.
    Uniform on purpose: Aggregate output is always {data: [...]}, even for
    one item, so the prompt expression has exactly one shape."""
    resolved = resolved_by_step[step.step]
    if resolved.kind != "agent_root":
        return False
    for d in step.depends_on:
        dep_step = by_step.get(d)
        dep_resolved = resolved_by_step.get(d)
        if dep_step is None or dep_resolved is None:
            continue
        if dep_step.is_trigger or dep_resolved.kind == "ai_subnode":
            continue
        return True
    return False


def _synthesize_aggregate(step: Step, report: CompileReport) -> ResolvedNode | None:
    util = get_utility_node("aggregate")
    if util is None:
        report.warnings.append(
            f"step {step.step} ({step.service}) is an AI step with upstream "
            "data but the registry has no 'aggregate' utility node entry -- "
            "add n8n-nodes-base.aggregate to UTILITY_NODE_NAMES in "
            "scripts/generate_registry.py and regenerate. The agent will run "
            "once per item instead."
        )
        return None
    return ResolvedNode(
        step=step.step,
        kind="utility",
        node_type=util["type"],
        type_version=util["typeVersion"],
        name=aggregate_node_name(step.step),
        fixed_params=dict(AGGREGATE_FIXED_PARAMS),
        layout_hint="before_step",
    )


def _synthesize_merge(
    step: Step, incoming_count: int, report: CompileReport
) -> ResolvedNode | None:
    """Builds the Merge ResolvedNode for a fan-in step, or None (+ a
    warning) if the registry has no 'merge' utility node yet."""
    util = get_utility_node("merge")
    if util is None:
        report.warnings.append(
            f"step {step.step} ({step.service}) has {incoming_count} incoming "
            "dependencies but the registry has no 'merge' utility node entry -- "
            "regenerate generated_registry.json (scripts/generate_registry.py) "
            "to pick up the utility-node module. Falling back to the first "
            "dependency only."
        )
        return None
    return ResolvedNode(
        step=step.step,
        kind="utility",
        node_type=util["type"],
        type_version=util["typeVersion"],
        name=f"Merge into step {step.step}",
        fixed_params={"numberInputs": incoming_count},
        layout_hint="before_step",
    )


def _placeholder_switch_rule(label: str) -> dict:
    """One entry of Switch's rules.values[], mirroring n8n's own
    documented default for a blank Routing Rule (nodes.json's `rules`
    property `default` key) -- real condition expressions are still
    deferred, same as every other step's real parameters. `outputKey` +
    `renameOutput` give the output a readable name in the n8n UI; they
    are cosmetic only, never load-bearing for routing (array position is
    the actual routing key)."""
    return {
        "conditions": {
            "options": {
                "caseSensitive": True,
                "leftValue": "",
                "typeValidation": "strict",
            },
            "conditions": [
                {
                    "leftValue": "",
                    "rightValue": "",
                    "operator": {"type": "string", "operation": "equals"},
                }
            ],
            "combinator": "and",
        },
        "renameOutput": True,
        "outputKey": label,
    }


def _synthesize_switch(step: Step, report: CompileReport) -> ResolvedNode | None:
    """Builds the Switch ResolvedNode for a step carrying `condition`, or
    None (+ a warning) if the registry has no 'switch' utility node yet.
    One synthesized Switch per branching step; output index = the
    branch's position in step.condition, in order -- never reordered or
    sorted."""
    util = get_utility_node("switch")
    if util is None:
        labels = [b.label for b in step.condition]
        report.warnings.append(
            f"step {step.step} ({step.service}) has condition branches {labels!r} "
            "but the registry has no 'switch' utility node entry -- regenerate "
            "generated_registry.json (scripts/generate_registry.py) to pick up "
            "the utility-node module. Downstream branch steps will fall back to "
            "wiring directly from this step instead."
        )
        return None
    return ResolvedNode(
        step=step.step,
        kind="utility",
        node_type=util["type"],
        type_version=util["typeVersion"],
        name=f"Switch (step {step.step})",
        fixed_params={
            "mode": "rules",
            "rules": {
                "values": [
                    _placeholder_switch_rule(branch.label) for branch in step.condition
                ]
            },
        },
        layout_hint="after_step",
    )


def build_connections(
    steps: list[Step],
    resolved_by_step: dict[int, ResolvedNode],
    report: CompileReport,
) -> tuple[list[N8nConnection], list[ResolvedNode]]:
    connections: list[N8nConnection] = []
    synthesized: list[ResolvedNode] = []
    by_step = {s.step: s for s in steps}

    # Pass 1: synthesize a Switch node for every step carrying `condition`,
    # and wire that step's own main output into the Switch's single main
    # input. A separate pass (not inlined into pass 2) so branch-routing
    # lookups below never depend on step-list ordering.
    switch_by_step: dict[int, ResolvedNode] = {}
    for step in steps:
        if not step.condition:
            continue
        resolved = resolved_by_step[step.step]
        switch_node = _synthesize_switch(step, report)
        if switch_node is None:
            continue
        switch_by_step[step.step] = switch_node
        synthesized.append(switch_node)
        connections.append(
            N8nConnection(
                source_name=resolved.name,
                source_output="main",
                source_index=0,
                target_name=switch_node.name,
                target_input="main",
                target_index=0,
            )
        )

    # Pass 2: subnode wiring, then main-chain wiring -- branch-routed
    # through a synthesized Switch where applicable, Merge-synthesized
    # fan-in for everything else.
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

        # Aggregate sits between the step's inbound wiring and the agent;
        # every inbound connection below targets entry_name instead of
        # resolved.name. Subnode wiring above still targets the agent itself.
        entry_name = resolved.name
        if agent_needs_aggregate(step, by_step, resolved_by_step):
            agg = _synthesize_aggregate(step, report)
            if agg is not None:
                synthesized.append(agg)
                connections.append(
                    N8nConnection(
                        source_name=agg.name,
                        source_output="main",
                        source_index=0,
                        target_name=resolved.name,
                        target_input="main",
                        target_index=0,
                    )
                )
                entry_name = agg.name

        incoming_nums = [d for d in step.depends_on if by_step.get(d) is not None]
        normal_deps: list[tuple[int, ResolvedNode]] = []
        branch_routed = False
        saw_conditioned_dep = False

        for dep_num in incoming_nums:
            dep_step = by_step[dep_num]
            dep_resolved = resolved_by_step.get(dep_num)
            if dep_resolved is None or dep_resolved.kind == "ai_subnode":
                continue

            if step.branch is not None and dep_step.condition:
                saw_conditioned_dep = True
                switch_node = switch_by_step.get(dep_num)
                label_to_index = {b.label: i for i, b in enumerate(dep_step.condition)}
                idx = label_to_index.get(step.branch)
                if switch_node is not None and idx is not None:
                    connections.append(
                        N8nConnection(
                            source_name=switch_node.name,
                            source_output="main",
                            source_index=idx,
                            target_name=entry_name,
                            target_input="main",
                            target_index=0,
                        )
                    )
                    branch_routed = True
                    continue
                reason = (
                    "the Switch synthesis failed for that step"
                    if switch_node is None
                    else f"{step.branch!r} isn't one of its condition labels "
                    f"{[b.label for b in dep_step.condition]!r}"
                )
                report.warnings.append(
                    f"step {step.step} ({step.service}) declares branch "
                    f"{step.branch!r} off step {dep_num}, but {reason} -- "
                    "wiring directly from the dependency instead."
                )

            normal_deps.append((dep_num, dep_resolved))

        if step.branch is not None and not branch_routed and not saw_conditioned_dep:
            # Only the generic case here -- a dependency that DID have a
            # condition but a mismatched label already got a precise
            # warning above; don't double up on the same root cause with
            # a second, less specific (and here, inaccurate) message.
            report.warnings.append(
                f"step {step.step} ({step.service}) declares branch "
                f"{step.branch!r} but none of its dependencies "
                f"{incoming_nums!r} carry a condition at all -- treating "
                "as a normal (unbranched) dependency."
            )

        if len(normal_deps) > 1:
            merge_node = _synthesize_merge(step, len(normal_deps), report)
            if merge_node is not None:
                synthesized.append(merge_node)
                for idx, (_, dep) in enumerate(normal_deps):
                    connections.append(
                        N8nConnection(
                            source_name=dep.name,
                            source_output="main",
                            source_index=0,
                            target_name=merge_node.name,
                            target_input="main",
                            target_index=idx,
                        )
                    )
                connections.append(
                    N8nConnection(
                        source_name=merge_node.name,
                        source_output="main",
                        source_index=0,
                        target_name=entry_name,
                        target_input="main",
                        target_index=0,
                    )
                )
                continue
            # registry lookup failed -- fall back to the original behavior
            normal_deps = normal_deps[:1]

        for _, dep in normal_deps:
            connections.append(
                N8nConnection(
                    source_name=dep.name,
                    source_output="main",
                    source_index=0,
                    target_name=entry_name,
                    target_input="main",
                    target_index=0,
                )
            )

    return connections, synthesized