"""
The compile() entrypoint, rewritten against the real
app.core.n8n_operation_registry / app.core.integration_catalog.
Pure function otherwise: same inputs -> same output, no direct
Postgres/n8n HTTP calls here (that's the caller's job).
"""

from __future__ import annotations

import uuid
from typing import Any, Optional

from app.core.n8n_operation_registry import resolve_operation

from .graph import build_connections
from .interfaces import CredentialResolver, MissingRequiredParam, ParamProvider
from .layout import X_SPACING, Y_SPACING, layout_positions
from .param_schema import get_required_params
from .resolve import resolve_all_steps
from .models import (
    CompileReport,
    CompileResult,
    N8nConnection,
    N8nNode,
    Step,
    UnresolvedStep,
    Overrides,
)


def _apply_overrides(steps: list[Step], overrides: Optional[Overrides]) -> None:
    """
    A StepOverride exists specifically to let the caller resolve an
    ambiguous/no_operation_match step (see resolve.py's needs_user_input
    -> candidates) by picking one real operation. Rewriting step.operation/
    step.target ALONE does nothing on its own -- instantiate_step() branches
    on step.n8n_resolution_kind (the server-side-enrichment field), not on
    step.operation, so a no_operation_match step stays no_operation_match
    no matter what free text operation/target now say. This resolves the
    override against the same real registry resolve_operation() every
    other action_node step goes through, and stamps n8n_resolution_kind/
    n8n_operation so the rest of the pipeline treats it exactly like a
    step the server resolved correctly in the first place.
    """
    if not overrides:
        return
    for step in steps:
        ov = overrides.get(step.step)
        if ov is None:
            continue
        if ov.operation:
            step.operation = ov.operation
        if ov.target:
            step.target = ov.target

        if step.is_trigger:
            continue  # overrides don't apply to the synthetic trigger step

        resolved_op = resolve_operation(
            step.service, step.operation, resource=step.target
        )
        if resolved_op is not None:
            step.n8n_resolution_kind = "action_node"
            step.n8n_operation = resolved_op
        # If it still doesn't resolve (e.g. the override itself is
        # ambiguous, or names an operation that doesn't exist for this
        # resource), leave n8n_resolution_kind untouched -- resolve.py
        # will correctly re-report it as needs_user_input with the real
        # candidate list, same as an unresolved step that was never
        # overridden at all.


def compile(
    steps: list[Step],
    param_provider: ParamProvider,
    credential_resolver: CredentialResolver,
    user_id: str,
    workflow_name: str = "Generated Workflow",
    overrides: Optional[Overrides] = None,
) -> CompileResult:
    report = CompileReport()
    _apply_overrides(steps, overrides)

    # Stage 2: instantiate every step against the real registry.
    resolved_by_step, resolve_report = resolve_all_steps(steps)
    report.needs_user_input.extend(resolve_report.needs_user_input)

    if not report.is_deployable:
        return CompileResult(workflow_json=None, report=report)

    connections, synthesized_nodes = build_connections(steps, resolved_by_step, report)
    positions = layout_positions(steps, resolved_by_step)

    n8n_nodes: list[N8nNode] = []
    for step in steps:
        resolved = resolved_by_step[step.step]

        if resolved.kind == "agent_root":
            # The Agent root's own params are fixed shape, not collected via
            # the generic param_provider/field_defs flow (it has no
            # resource/operation menu) -- source the prompt from
            # step.instructions, which is now a real, server-validated,
            # min-length-checked field (n8n_subnode.agent_instructions_source
            # == "step.instructions"). Keep the empty-string fallback as a
            # true edge case, per the realignment plan.
            n8n_nodes.append(
                N8nNode(
                    id=str(uuid.uuid4()),
                    name=resolved.name,
                    type=resolved.node_type,
                    typeVersion=resolved.type_version,
                    position=positions.get(step.step, [0, 0]),
                    parameters={
                        "promptType": "define",
                        "text": step.instructions or "",
                    },
                    credentials={},  # the Agent root itself has no credential
                )
            )

            base_pos = positions.get(step.step, [0, 0])
            for i, sub in enumerate(resolved.subnodes):
                sub_creds: dict[str, Any] = {}
                if sub.n8n_credential_type:
                    cred = credential_resolver.resolve(
                        user_id, step.service, sub.n8n_credential_type
                    )
                    if cred is None:
                        report.warnings.append(
                            f"step {step.step} ({step.service}) subnode "
                            f"{sub.name!r}: no credential connected for "
                            f"{sub.n8n_credential_type}; node will be created "
                            "without one"
                        )
                    else:
                        # Key by the credential's REAL type (the resolver
                        # may report a different type than what was asked
                        # for -- e.g. the user connected via OAuth2 while
                        # instantiate.py assumed the service's default,
                        # non-OAuth option). Falls back to the requested
                        # type only if an older resolver doesn't return one.
                        cred_type = cred.get("type", sub.n8n_credential_type)
                        sub_creds[cred_type] = {
                            k: v for k, v in cred.items() if k != "type"
                        }

                n8n_nodes.append(
                    N8nNode(
                        id=str(uuid.uuid4()),
                        name=sub.name,
                        type=sub.node_type,
                        typeVersion=sub.type_version,
                        # Simple offset beneath the Agent root -- layout.py
                        # doesn't know about subnodes yet (realignment plan
                        # flags this: "subnode_position in layout.py" still
                        # to be added).
                        position=[base_pos[0], base_pos[1] + 150 + i * 150],
                        parameters={},  # model field is optional w/ a default
                        credentials=sub_creds,
                    )
                )
            continue

        field_defs = []
        if resolved.node_type is not None and resolved.type_version is not None:
            field_defs = get_required_params(
                resolved.node_type, resolved.type_version, step.target, step.operation
            )

        try:
            params = param_provider.get_params(step, resolved, field_defs)
        except MissingRequiredParam as e:
            report.needs_user_input.append(
                UnresolvedStep(
                    step=e.step,
                    service=e.service,
                    reason=f"missing required parameter(s): {', '.join(e.field_names)}",
                    candidates=[],
                )
            )
            continue

        creds: dict[str, Any] = {}
        if resolved.n8n_credential_type:
            cred = credential_resolver.resolve(
                user_id, step.service, resolved.n8n_credential_type
            )
            if cred is None:
                report.warnings.append(
                    f"step {step.step} ({step.service}): no credential connected for "
                    f"{resolved.n8n_credential_type}; node will be created without one"
                )
            else:
                # See the agent-subnode branch above for why this keys by
                # the credential's REAL reported type, not the type that
                # was asked for.
                cred_type = cred.get("type", resolved.n8n_credential_type)
                creds[cred_type] = {k: v for k, v in cred.items() if k != "type"}

        n8n_nodes.append(
            N8nNode(
                id=str(uuid.uuid4()),
                name=resolved.name,
                type=resolved.node_type,
                typeVersion=resolved.type_version,
                position=positions.get(step.step, [0, 0]),
                parameters=params,
                credentials=creds,
            )
        )

    if report.is_deployable:
        # Synthesized nodes (Merge, Switch) have no step of their own --
        # graph.py stamps resolved.step with whichever real step anchors
        # their position, and resolved.layout_hint says which side of it:
        # Merge sits upstream of the step it feeds ("before_step"), Switch
        # sits downstream of the step that carries the condition
        # ("after_step") -- opposite offsets, so this can't be a single
        # fixed sign. Stacks in the rare case more than one synthesized
        # node anchors to the same step + side. Credentials={} always --
        # none of these take a credential. Parameters come straight from
        # fixed_params (e.g. Merge's {"numberInputs": N}, Switch's
        # {"mode": "rules", "rules": {...}}), never the param_provider
        # flow -- these are structural, not user-collected, fields.
        slot_by_anchor: dict[tuple[int, str], int] = {}
        for node in synthesized_nodes:
            anchor_pos = positions.get(node.step, [0, 0])
            slot_key = (node.step, node.layout_hint)
            slot = slot_by_anchor.get(slot_key, 0)
            slot_by_anchor[slot_key] = slot + 1
            x_offset = (
                -X_SPACING * 0.5
                if node.layout_hint == "before_step"
                else X_SPACING * 0.5
            )
            n8n_nodes.append(
                N8nNode(
                    id=str(uuid.uuid4()),
                    name=node.name,
                    type=node.node_type,
                    typeVersion=node.type_version,
                    position=[
                        anchor_pos[0] + x_offset,
                        anchor_pos[1] + slot * (Y_SPACING * 0.6),
                    ],
                    parameters=dict(node.fixed_params),
                    credentials={},
                )
            )

    if not report.is_deployable:
        # A step hit MissingRequiredParam mid-loop -- n8n_nodes is now
        # incomplete and connections still reference the skipped node's
        # name, so there's no safe partial workflow_json to return here.
        return CompileResult(workflow_json=None, report=report)

    workflow_json = {
        "name": workflow_name,
        "nodes": [
            {
                "id": n.id,
                "name": n.name,
                "type": n.type,
                "typeVersion": n.typeVersion,
                "position": n.position,
                "parameters": n.parameters,
                **({"credentials": n.credentials} if n.credentials else {}),
            }
            for n in n8n_nodes
        ],
        "connections": _connections_to_n8n_shape(connections),
        "settings": {},
    }

    return CompileResult(
        workflow_json=workflow_json,
        report=report,
        nodes=n8n_nodes,
        connections=connections,
    )


def _connections_to_n8n_shape(connections: list[N8nConnection]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for c in connections:
        by_output = result.setdefault(c.source_name, {})
        slots = by_output.setdefault(c.source_output, [])
        while len(slots) <= c.source_index:
            slots.append([])
        slots[c.source_index].append(
            {"node": c.target_name, "type": c.target_input, "index": c.target_index}
        )
    return result

