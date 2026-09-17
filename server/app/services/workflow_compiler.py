"""
Workflow Compiler v0
====================
Compiles validated IR Schema v4 JSON into an n8n-ready workflow payload
compatible with n8n's POST /api/v1/workflows API.

Architecture:
- Trigger: Webhook node (HTTP POST) as entry point.
- Resolution branches:
  * 'action_node' -> standard n8n app node (Gmail, Google Calendar, etc.) with credential attached.
  * 'ai_subnode'   -> paired Agent node (LangChain) + Chat Model sub-node (Groq), wired via 'ai_languageModel'.
- Graph wiring: DAG built from `depends_on` field, supporting fan-out and multi-step chains.
"""

import logging
import re
import uuid
from typing import Any
from sqlalchemy.orm import Session

from app.models.integration import Integration
from app.core.n8n_operation_registry import get_service_entry

logger = logging.getLogger(__name__)


class WorkflowCompilerError(Exception):
    """Raised when compilation fails due to missing credentials, invalid schema, or unmapped nodes."""
    def __init__(self, message: str, step_num: int | None = None, service: str | None = None):
        super().__init__(message)
        self.step_num = step_num
        self.service = service


# ---------------------------------------------------------------------------
# Node Type Mapping Helpers
# ---------------------------------------------------------------------------

def _node_path_to_n8n_type(node_path: str) -> str:
    """Converts a registry node_path (e.g. 'Google/Gmail', 'DeepL') to an n8n node type slug."""
    segments = [s for s in re.split(r"[/\\]", node_path) if s]
    if not segments:
        return "n8n-nodes-base.unknown"
    if len(segments) > 1 and segments[0].lower() == "google" and segments[1].lower() == "gmail":
        return "n8n-nodes-base.gmail"
    if len(segments) > 1:
        camel = segments[0].lower() + "".join(s.capitalize() for s in segments[1:])
        return f"n8n-nodes-base.{camel}"
    seg = segments[0]
    camel = seg[0].lower() + seg[1:] if seg else ""
    return f"n8n-nodes-base.{camel}"


def resolve_action_node_type_from_step(step: dict) -> str:
    """
    Resolves the n8n node type for an action_node step using the step's own
    resolved metadata (service, target, operation, n8n_operation) matched
    against n8n_operation_registry, avoiding duplicate resolution drift.
    """
    service = (step.get("service") or "").strip().lower()
    target = (step.get("target") or "").strip().lower()

    entry = get_service_entry(service)
    if entry and entry.get("node_paths"):
        node_paths = entry["node_paths"]
        if len(node_paths) == 1:
            return _node_path_to_n8n_type(node_paths[0])

        # Multi-node path entry (e.g. generic 'google' or multi-resource service):
        # Disambiguate by matching target/resource against node_path segments
        if target:
            for path in node_paths:
                clean_path = path.lower().replace(" ", "").replace("-", "")
                clean_target = target.lower().replace("_", "")
                if clean_target in clean_path:
                    return _node_path_to_n8n_type(path)

        # Fallback to the first declared path in registry
        return _node_path_to_n8n_type(node_paths[0])

    # Fallback path if registry entry or node_paths is missing
    logger.warning(
        "Fallback action node type resolution triggered for step '%s' (service='%s', target='%s'). "
        "Service was not found in n8n_operation_registry or had no node_paths.",
        step.get("step"),
        service,
        target,
    )
    return resolve_action_node_type_fallback(service)


def resolve_action_node_type_fallback(service: str) -> str:
    """
    Fallback heuristic conversion if registry lookup fails.
    """
    service_clean = service.lower().strip()
    parts = service_clean.split("_")
    camel_slug = parts[0] + "".join(p.capitalize() for p in parts[1:])
    return f"n8n-nodes-base.{camel_slug}"


# ---------------------------------------------------------------------------
# Credential Lookup Helper
# ---------------------------------------------------------------------------

def lookup_user_credential(
    db: Session | None,
    user_id: Any,
    service: str,
    step_num: int | None = None,
) -> dict:
    """
    Finds the active Integration row for a user and service, returning
    the credentials dictionary block expected by an n8n node.
    """
    if db is None:
        # Allows unit-testing compiler in pure isolation with placeholder credentials
        return {
            f"{service}Api": {
                "id": f"mock-cred-{service}",
                "name": f"{service} Credential",
            }
        }

    # Normalize user_id if string passed
    user_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id

    row = (
        db.query(Integration)
        .filter(
            Integration.user_id == user_uuid,
            Integration.service == service,
            Integration.is_active.is_(True),
        )
        .first()
    )

    if not row:
        step_prefix = f"Step {step_num}: " if step_num is not None else ""
        raise WorkflowCompilerError(
            f"{step_prefix}Missing active integration credential for '{service}'. "
            f"Please connect {service} in Integrations before deploying.",
            step_num=step_num,
            service=service,
        )

    if row.oauth_pending:
        step_prefix = f"Step {step_num}: " if step_num is not None else ""
        raise WorkflowCompilerError(
            f"{step_prefix}OAuth authorization for '{service}' is pending. "
            f"Please complete OAuth authentication for {service}.",
            step_num=step_num,
            service=service,
        )

    return {
        row.n8n_credential_type: {
            "id": row.n8n_credential_id,
            "name": row.display_name or f"{row.service} credential",
        }
    }


# ---------------------------------------------------------------------------
# Node Builders
# ---------------------------------------------------------------------------

def build_webhook_trigger_node(workflow_name: str, position: list[int]) -> dict:
    """
    Builds the entry webhook trigger node.
    # TODO(v1): Support schedule / polling triggers and dynamic input payload schema.
    """
    safe_slug = re.sub(r"[^a-zA-Z0-9_-]", "-", workflow_name.lower()).strip("-") or "workflow"
    path_uuid = uuid.uuid4().hex[:8]
    webhook_path = f"{safe_slug}-{path_uuid}"

    return {
        "id": str(uuid.uuid4()),
        "name": "Webhook Trigger",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": position,
        "parameters": {
            "httpMethod": "POST",
            "path": webhook_path,
            "responseMode": "onReceived",
            "options": {},
        },
    }


def build_action_node(
    step: dict,
    step_num: int,
    user_id: Any,
    db: Session | None,
    position: list[int],
) -> dict:
    """
    Builds a standard n8n action node (e.g. Gmail, Google Calendar) using
    the resolved n8n_operation and metadata already present on the step.
    # TODO(v1): Implement dynamic parameter expressions and condition / IF-node branching.
    """
    service = step.get("service", "")
    node_type = resolve_action_node_type_from_step(step)
    service_title = service.replace("_", " ").title()
    node_name = f"{service_title} (Step {step_num})"

    parameters: dict[str, Any] = {}

    # Target -> resource
    target = step.get("target")
    if target:
        parameters["resource"] = target

    # Operation
    n8n_op = step.get("n8n_operation")
    if isinstance(n8n_op, dict) and n8n_op.get("value"):
        parameters["operation"] = n8n_op["value"]
    elif step.get("operation"):
        parameters["operation"] = step["operation"]

    # Merge explicit parameters if present in step
    step_params = step.get("parameters")
    if isinstance(step_params, dict):
        parameters.update(step_params)

    # Lookup credentials
    credentials = lookup_user_credential(db, user_id, service, step_num=step_num)

    return {
        "id": str(uuid.uuid4()),
        "name": node_name,
        "type": node_type,
        "typeVersion": 1,
        "position": position,
        "parameters": parameters,
        "credentials": credentials,
    }


def build_ai_subnodes(
    step: dict,
    step_num: int,
    user_id: Any,
    db: Session | None,
    agent_pos: list[int],
    model_pos: list[int],
) -> tuple[dict, dict]:
    """
    Builds the paired LangChain Agent node and Chat Model sub-node for an 'ai_subnode' step.
    # TODO(v1): Support additional LLM providers (Anthropic, OpenAI) and subnode tool bindings.
    """
    service = step.get("service", "groq")
    subnode_info = step.get("n8n_subnode") or {}

    root_node_type = subnode_info.get("root_node_type") or "n8n-nodes-langchain.agent"
    chat_model_node_type = subnode_info.get("chat_model_node_type") or "n8n-nodes-langchain.lmChatGroq"

    agent_name = f"AI Agent (Step {step_num})"
    chat_model_name = f"Groq Chat Model (Step {step_num})"

    instructions = step.get("instructions", "")

    # LangChain Agent node
    agent_node = {
        "id": str(uuid.uuid4()),
        "name": agent_name,
        "type": root_node_type,
        "typeVersion": 1.7,
        "position": agent_pos,
        "parameters": {
            "promptType": "define",
            "text": instructions,
            "options": {},
        },
    }

    # Chat Model node
    credentials = lookup_user_credential(db, user_id, service, step_num=step_num)
    chat_model_node = {
        "id": str(uuid.uuid4()),
        "name": chat_model_name,
        "type": chat_model_node_type,
        "typeVersion": 1,
        "position": model_pos,
        "parameters": {
            "options": {},
        },
        "credentials": credentials,
    }

    return agent_node, chat_model_node


# ---------------------------------------------------------------------------
# Layout & Positioning
# ---------------------------------------------------------------------------

def calculate_step_depths(steps: list[dict]) -> dict[int, int]:
    """
    Calculates the topological depth (column index) for each step based on depends_on.
    Trigger is at depth 0, roots (depends_on: []) are at depth 1.
    """
    step_map = {step.get("step", idx + 1): step for idx, step in enumerate(steps)}
    depths: dict[int, int] = {}

    def get_depth(step_num: int, visited: set) -> int:
        if step_num in depths:
            return depths[step_num]
        if step_num in visited:
            return 1  # Break cycle fallback
        visited.add(step_num)

        step_obj = step_map.get(step_num)
        if not step_obj:
            return 1

        deps = step_obj.get("depends_on", [])
        if not deps:
            depths[step_num] = 1
            return 1

        max_parent_depth = 0
        for parent_num in deps:
            parent_depth = get_depth(parent_num, visited)
            if parent_depth > max_parent_depth:
                max_parent_depth = parent_depth

        depths[step_num] = max_parent_depth + 1
        return depths[step_num]

    for step_num in step_map:
        get_depth(step_num, set())

    return depths


# ---------------------------------------------------------------------------
# Main Compiler Entry Point
# ---------------------------------------------------------------------------

def compile_ir_to_n8n_workflow(ir_schema: dict, user_id: str | uuid.UUID, db_session: Session | None = None) -> dict:
    """
    Input: a full IR Schema v4 dict (or the preview_json object specifically).
    Output: a dict matching n8n's workflow creation payload:
        { "name": str, "nodes": [...], "connections": {...}, "settings": {...} }
    """
    if not isinstance(ir_schema, dict):
        raise WorkflowCompilerError("Invalid IR schema: expected a dictionary")

    # Resolve preview_json if wrapped inside full IR schema dictionary
    preview_json = ir_schema.get("preview_json") if "preview_json" in ir_schema and isinstance(ir_schema["preview_json"], dict) else ir_schema
    workflow_name = preview_json.get("title") or ir_schema.get("automation_name") or "Generated Workflow"
    steps = preview_json.get("workflow", [])

    if not isinstance(steps, list):
        raise WorkflowCompilerError("Invalid IR schema: 'workflow' steps array missing or invalid")

    nodes: list[dict] = []
    connections: dict[str, dict[str, list[list[dict]]]] = {}

    # 1. Trigger Node at depth 0
    trigger_node = build_webhook_trigger_node(workflow_name, position=[240, 300])
    trigger_name = trigger_node["name"]
    nodes.append(trigger_node)

    if not steps:
        return {
            "name": workflow_name,
            "nodes": nodes,
            "connections": connections,
            "settings": {},
        }

    # 2. Compute depths for clean visual layout
    depths = calculate_step_depths(steps)

    # Track column occupancy to space nodes vertically
    column_counts: dict[int, int] = {}
    X_START = 240
    X_SPACING = 300
    Y_START = 180
    Y_SPACING = 280

    # Step number -> representative node name (used for downstream 'main' connections)
    step_representative_node: dict[int, str] = {}

    # Build nodes for each step
    for idx, step in enumerate(steps):
        step_num = step.get("step", idx + 1)
        depth = depths.get(step_num, 1)
        col_idx = column_counts.get(depth, 0)
        column_counts[depth] = col_idx + 1

        x_pos = X_START + (depth * X_SPACING)
        y_pos = Y_START + (col_idx * Y_SPACING)

        resolution_kind = step.get("n8n_resolution_kind")

        if resolution_kind == "ai_subnode":
            agent_pos = [x_pos, y_pos]
            model_pos = [x_pos, y_pos + 120]

            agent_node, chat_model_node = build_ai_subnodes(
                step=step,
                step_num=step_num,
                user_id=user_id,
                db=db_session,
                agent_pos=agent_pos,
                model_pos=model_pos,
            )

            nodes.append(agent_node)
            nodes.append(chat_model_node)

            step_representative_node[step_num] = agent_node["name"]

            # Connect Chat Model -> Agent node via 'ai_languageModel'
            connections[chat_model_node["name"]] = {
                "ai_languageModel": [
                    [
                        {
                            "node": agent_node["name"],
                            "type": "ai_languageModel",
                            "index": 0,
                        }
                    ]
                ]
            }

        elif resolution_kind == "action_node":
            action_pos = [x_pos, y_pos]
            action_node = build_action_node(
                step=step,
                step_num=step_num,
                user_id=user_id,
                db=db_session,
                position=action_pos,
            )
            nodes.append(action_node)
            step_representative_node[step_num] = action_node["name"]

        else:
            # Fallback for unmapped or generic steps
            action_pos = [x_pos, y_pos]
            action_node = build_action_node(
                step=step,
                step_num=step_num,
                user_id=user_id,
                db=db_session,
                position=action_pos,
            )
            nodes.append(action_node)
            step_representative_node[step_num] = action_node["name"]

    # 3. Build 'main' connections from depends_on
    # Trigger connections (fan-out to all root steps with depends_on: [])
    trigger_targets = []
    for idx, step in enumerate(steps):
        step_num = step.get("step", idx + 1)
        deps = step.get("depends_on", [])
        target_name = step_representative_node.get(step_num)
        if not deps and target_name:
            trigger_targets.append({
                "node": target_name,
                "type": "main",
                "index": 0,
            })

    if trigger_targets:
        connections[trigger_name] = {
            "main": [trigger_targets]
        }

    # Inter-step dependencies
    for idx, step in enumerate(steps):
        step_num = step.get("step", idx + 1)
        deps = step.get("depends_on", [])
        current_node_name = step_representative_node.get(step_num)
        if not current_node_name:
            continue

        for parent_step_num in deps:
            parent_node_name = step_representative_node.get(parent_step_num)
            if not parent_node_name:
                continue

            if parent_node_name not in connections:
                connections[parent_node_name] = {"main": [[]]}
            elif "main" not in connections[parent_node_name]:
                connections[parent_node_name]["main"] = [[]]

            # Append downstream target
            connections[parent_node_name]["main"][0].append({
                "node": current_node_name,
                "type": "main",
                "index": 0,
            })

    # # TODO(v1): Add settings for workflow timezone, execution error handling, and timeout configurations.
    return {
        "name": workflow_name,
        "nodes": nodes,
        "connections": connections,
        "settings": {},
    }
