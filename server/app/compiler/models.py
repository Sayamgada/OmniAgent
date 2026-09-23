"""
Step 1 — Contracts.

Plain dataclasses shared by every compiler stage. Nothing here talks to
n8n, Groq, or the registry directly — stages 2-5 read/write these types,
so each stage can be tested in isolation against golden fixtures.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Optional

# ---------------------------------------------------------------------------
# Input side — one Step per entry in preview_json["workflow"]
# ---------------------------------------------------------------------------

ResolutionKind = Literal[
    "action_node",
    "ai_subnode",
    "multi_node_hub",
    "http_only",
    "no_operation_match",
    "utility",
]


@dataclass
class ConditionBranch:
    """A single branch of a step's condition, if it has one."""

    label: str
    expression: str


@dataclass
class Step:
    """
    One entry from preview_json["workflow"], normalized.

    `step` is the 1-indexed step number from the Groq output contract.
    `depends_on` defaults to [previous step] by the caller if the preview
    JSON is a flat linear list (today's common case) — this dataclass
    itself makes no assumption about linearity.
    """

    step: int
    service: str
    action: str  # free-text action description from Groq, e.g. "Send a message"
    operation: Optional[str] = None  # resolved n8n operation value, e.g. "send"
    resource: Optional[str] = None  # resolved n8n resource, e.g. "message"
    depends_on: list[int] = field(default_factory=list)
    condition: Optional[list[ConditionBranch]] = None
    branch: Optional[str] = None  # which branch label this step lives on, if any
    instructions: Optional[str] = None  # prompt text, for ai_subnode steps
    is_trigger: bool = False
    raw: dict[str, Any] = field(
        default_factory=dict
    )  # original step JSON, for debugging


# ---------------------------------------------------------------------------
# Middle — a Step resolved against generated_registry.json
# ---------------------------------------------------------------------------


@dataclass
class ResolvedNode:
    """
    Output of stage 2 (node instantiation) for a single Step, before it's
    turned into n8n's exact node JSON shape.
    """

    step: int
    kind: ResolutionKind
    node_type: Optional[str] = None  # n8n node type string, e.g. "n8n-nodes-base.gmail"
    type_version: Optional[float] = None
    n8n_credential_type: Optional[str] = None  # join key back to credentials
    is_tool_variant: bool = False
    ai_connection_type: Optional[str] = None  # e.g. "ai_languageModel", for ai_subnode
    candidates: list[dict[str, Any]] = field(default_factory=list)  # unresolved options
    name: Optional[str] = None  # unique display name, assigned in stage 2


# ---------------------------------------------------------------------------
# Output side — n8n's own workflow JSON shape
# ---------------------------------------------------------------------------


@dataclass
class N8nNode:
    id: str
    name: str
    type: str
    typeVersion: float
    position: list[float]
    parameters: dict[str, Any] = field(default_factory=dict)
    credentials: dict[str, Any] = field(default_factory=dict)


@dataclass
class N8nConnection:
    source_name: str
    source_output: str  # "main" or "ai_languageModel" etc.
    source_index: int
    target_name: str
    target_input: str
    target_index: int


# ---------------------------------------------------------------------------
# Compile result / report
# ---------------------------------------------------------------------------


@dataclass
class UnresolvedStep:
    step: int
    service: str
    reason: str
    candidates: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class CompileReport:
    warnings: list[str] = field(default_factory=list)
    needs_user_input: list[UnresolvedStep] = field(default_factory=list)

    @property
    def is_deployable(self) -> bool:
        return len(self.needs_user_input) == 0


@dataclass
class CompileResult:
    workflow_json: Optional[dict[str, Any]]  # None if not deployable
    report: CompileReport
    nodes: list[N8nNode] = field(default_factory=list)
    connections: list[N8nConnection] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Overrides — the one mechanism used for both disambiguation and (later)
# real parameter collection.
# ---------------------------------------------------------------------------


@dataclass
class StepOverride:
    operation: Optional[str] = None
    resource: Optional[str] = None
    params: dict[str, Any] = field(default_factory=dict)


Overrides = dict[int, StepOverride]  # keyed by step number
