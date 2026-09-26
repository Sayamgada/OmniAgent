"""
Step 1 — Swappable seams.

Two interfaces the compiler depends on but never implements a "real"
version of yet. Stage 4 (parameters) and stage 3 (credentials) call
through these so that real parameter-collection UX and real credential
lookups slot in later without touching stages 2, 5, 6, or 7.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Optional

from .models import ResolvedNode, Step


class ParamProvider(ABC):
    """Supplies node `parameters` for a resolved step."""

    @abstractmethod
    def get_params(
        self, step: Step, resolved: ResolvedNode, field_defs: list[dict[str, Any]]
    ) -> dict[str, Any]: ...


class PlaceholderParamProvider(ParamProvider):
    """
    Fills every required field (per param_schema.py's real extraction
    from nodes.json) with a type-appropriate placeholder. Also stamps
    `resource`/`operation` when the resolved node has them.

    This is for dev/test convenience only -- it produces a workflow that
    imports into n8n without the "Parameter X is required" errors, but
    the values are meaningless (literal "PLACEHOLDER" strings). Real
    user-facing param collection is SuppliedParamProvider, below.
    """

    _PLACEHOLDER_BY_TYPE = {
        "string": "PLACEHOLDER",
        "boolean": False,
        "number": 0,
        "options": None,  # filled from field's own default/options if present
    }

    def get_params(
        self, step: Step, resolved: ResolvedNode, field_defs: list[Any]
    ) -> dict[str, Any]:
        params: dict[str, Any] = {}

        if step.target:
            params["resource"] = step.target
        if step.operation:
            params["operation"] = step.operation

        for f in field_defs:
            if not f.required:
                continue
            if f.default not in (None, ""):
                params[f.name] = f.default
            else:
                params[f.name] = self._PLACEHOLDER_BY_TYPE.get(f.type, "PLACEHOLDER")

        return params


class SuppliedParamProvider(ParamProvider):
    """
    The real provider, once the param-collection form (param_form.py)
    exists on the frontend. Takes the values the user actually typed,
    keyed by step number then field name -- the same shape as
    Overrides[step].params, so a caller can build this straight from the
    same submission payload used for no_operation_match resolution.

    Unlike PlaceholderParamProvider, this does NOT invent values. If a
    field param_schema.py says is required is missing from what the user
    submitted, get_params() raises MissingRequiredParam rather than
    silently compiling an incomplete node -- compile.py catches this and
    adds the step to report.needs_user_input, same as an unresolved
    operation, rather than producing a workflow that will fail in n8n
    exactly like the manual import test did.
    """

    def __init__(self, supplied: dict[int, dict[str, Any]]):
        self._supplied = supplied

    def get_params(
        self, step: Step, resolved: ResolvedNode, field_defs: list[Any]
    ) -> dict[str, Any]:
        params: dict[str, Any] = {}
        if step.target:
            params["resource"] = step.target
        if step.operation:
            params["operation"] = step.operation

        step_values = self._supplied.get(step.step, {})
        missing: list[str] = []
        for f in field_defs:
            name = f.name
            if name in step_values:
                params[name] = step_values[name]
            elif f.required and (f.default in (None, "")):
                # A required field with no real default (like sendTo/
                # subject/message) and nothing supplied -- this is the
                # exact gap the manual n8n import surfaced.
                missing.append(name)
            elif f.default is not None:
                params[name] = f.default

        if missing:
            raise MissingRequiredParam(step.step, step.service, missing)

        return params


class MissingRequiredParam(Exception):
    def __init__(self, step: int, service: str, field_names: list[str]):
        self.step = step
        self.service = service
        self.field_names = field_names
        super().__init__(
            f"step {step} ({service}): missing required parameter(s): "
            f"{', '.join(field_names)}"
        )


class CredentialResolver(ABC):
    """Resolves the n8n credential id/name a node should reference."""

    @abstractmethod
    def resolve(
        self, user_id: str, n8n_credential_type: str
    ) -> Optional[dict[str, str]]:
        """Return {"id": ..., "name": ...} or None if not connected."""
        ...


class DummyCredentialResolver(CredentialResolver):
    """Stage-3 stub. Always returns a fake id — used in tests until the
    real Postgres-backed resolver (reading the integrations table's
    stored n8n credential id) is wired in."""

    def resolve(
        self, user_id: str, n8n_credential_type: str
    ) -> Optional[dict[str, str]]:
        return {"id": "DUMMY_CRED_ID", "name": f"dummy-{n8n_credential_type}"}
