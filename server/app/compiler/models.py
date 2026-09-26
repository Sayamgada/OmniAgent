"""
Step 1 — Contracts.

Plain dataclasses shared by every compiler stage. Nothing here talks to
n8n, Groq, or the registry directly — stages 2-5 read/write these types,
so each stage can be tested in isolation against golden fixtures.

Realigned (2026-09) against the REAL preview_json contract, per
omniagent_compiler_realignment_plan.md §2. Two things changed from the
first draft:

1. There is no free-text `action` field on a real workflow[] step —
   Groq already emits a canonical universal verb directly as
   `operation` (create/read/update/delete/list/send/search/generate/
   upload/download, per the 10-verb IR model), and `target` is already
   the resolved n8n resource value (validated server-side against
   list_resources()). The old `action: str` + verb-guessing bridge is
   gone.
2. The server (`_enrich_with_real_operations` / `_enrich_trigger` in
   workflow_generator.py) already resolves most of a step's n8n
   identity before the compiler ever sees it, and stamps the result
   onto the step as `n8n_resolution_kind` / `n8n_operation` /
   `n8n_subnode` / `n8n_http_node`. The trigger is a SEPARATE top-level
   object (`preview_json["trigger"]`), not workflow[] step 1. The
   compiler's job is to trust and consume these fields, not re-derive
   them — see loader.py/instantiate.py for how.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Optional

# ---------------------------------------------------------------------------
# Input side — one Step per entry in preview_json["workflow"], plus a
# synthetic step 0 for preview_json["trigger"] (see loader.py).
# ---------------------------------------------------------------------------

ResolutionKind = Literal[
    "action_node",
    "agent_root",  # the AI Agent node itself, for an ai_subnode step
    "ai_subnode",  # a chat-model/embedding/etc. subnode hanging off an agent_root
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
    One entry from preview_json["preview_json"]["workflow"], normalized,
    or the synthetic step 0 built from preview_json["preview_json"]["trigger"].

    `step` is the 1-indexed step number from the Groq output contract
    (0 is reserved for the synthetic trigger step — see loader.py).
    `depends_on` defaults to [0] (the trigger) by the loader when a real
    step's `depends_on` is empty.
    """

    step: int
    service: str
    operation: Optional[str] = None  # canonical verb, as Groq wrote it (e.g. "send")
    target: Optional[str] = None  # resolved n8n resource, e.g. "message" (was `resource`)
    depends_on: list[int] = field(default_factory=list)
    condition: Optional[list[ConditionBranch]] = None
    branch: Optional[str] = None  # which branch label this step lives on, if any
    instructions: Optional[str] = None  # prompt text, for ai_subnode/agent steps
    is_trigger: bool = False

    # --- server-side enrichment pass-through (workflow_generator.py) ---
    n8n_resolution_kind: Optional[str] = None  # action_node/ai_subnode/http_only/...
    n8n_operation: Optional[dict[str, Any]] = None  # {"label","value","action"} | None
    n8n_subnode: Optional[dict[str, Any]] = None  # ai_subnode steps only
    n8n_http_node: Optional[dict[str, Any]] = None  # http_only/flat_params_node steps only
    n8n_trigger_node: Optional[dict[str, Any]] = None  # synthetic trigger step only

    raw: dict[str, Any] = field(
        default_factory=dict
    )  # original step/trigger JSON, for debugging


# ---------------------------------------------------------------------------
# Middle — a Step resolved against the real registry (+ server enrichment)
# ---------------------------------------------------------------------------


@dataclass
class ResolvedNode:
    """
    Output of stage 2 (node instantiation) for a single Step, before it's
    turned into n8n's exact node JSON shape.

    For an ai_subnode step, this IS the agent_root node (the thing that
    sits in the step's main-chain position and receives step.instructions).
    Its `subnodes` list holds the chat-model (etc.) node(s) that must be
    wired into it via `ai_connection_type`, e.g. "ai_languageModel" — NOT
    wired via depends_on, since they belong to the same step.
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
    subnodes: list["ResolvedNode"] = field(default_factory=list)  # e.g. agent_root's chat model


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
    target: Optional[str] = None  # was `resource`, renamed to match Step.target
    params: dict[str, Any] = field(default_factory=dict)


Overrides = dict[int, StepOverride]  # keyed by step number