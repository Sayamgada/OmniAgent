"""
The compile() entrypoint, rewritten against the real
app.core.n8n_operation_registry / app.core.integration_catalog.
Pure function otherwise: same inputs -> same output, no direct
Postgres/n8n HTTP calls here (that's the caller's job).
"""

from __future__ import annotations

import uuid
from typing import Any, Optional

from .graph import build_connections
from .interfaces import CredentialResolver, ParamProvider
from .instantiate import instantiate_step
from .layout import layout_positions
from .models import (
    CompileReport,
    CompileResult,
    N8nConnection,
    N8nNode,
    ResolvedNode,
    Step,
    UnresolvedStep,
    Overrides,
)


def _apply_overrides(steps: list[Step], overrides: Optional[Overrides]) -> None:
    if not overrides:
        return
    for step in steps:
        ov = overrides.get(step.step)
        if ov is None:
            continue
        if ov.operation:
            step.operation = ov.operation
        if ov.resource:
            step.resource = ov.resource


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
    used_names: set[str] = set()

    # A service counts as an "AI cluster head" once the AI Agent root node
    # itself is built (Step 5). This vertical slice's fixtures have no AI
    # cluster, so this stays empty -- deliberate, not an omission. It only
    # affects whether instantiate_step() picks the `tool` node variant.
    ai_head_services: set[str] = set()

    resolved_by_step: dict[int, ResolvedNode] = {}
    for step in steps:
        resolved_by_step[step.step] = instantiate_step(
            step, used_names, ai_head_services
        )

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

    if not report.is_deployable:
        return CompileResult(workflow_json=None, report=report)

    connections = build_connections(steps, resolved_by_step, report)
    positions = layout_positions(steps, resolved_by_step)

    n8n_nodes: list[N8nNode] = []
    for step in steps:
        resolved = resolved_by_step[step.step]

        # No per-operation parameter schema exists in the registry (see
        # interfaces.py's PlaceholderParamProvider docstring) -- field_defs
        # is always [] until real collection reads nodes.json directly.
        params = param_provider.get_params(step, resolved, [])

        creds: dict[str, Any] = {}
        if resolved.n8n_credential_type:
            cred = credential_resolver.resolve(user_id, resolved.n8n_credential_type)
            if cred is None:
                report.warnings.append(
                    f"step {step.step} ({step.service}): no credential connected for "
                    f"{resolved.n8n_credential_type}; node will be created without one"
                )
            else:
                creds[resolved.n8n_credential_type] = cred

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
