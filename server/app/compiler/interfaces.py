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
    Stamps `resource`/`operation` when the resolved node has them.

    field_defs is currently always [] -- confirmed against the real
    generated_registry.json that auth_options[].fields describes the
    CREDENTIAL CONNECT FORM (OAuth client id, API key, etc.), not a
    node's per-operation action parameters (e.g. Gmail Send's
    to/subject/body). No per-operation parameter schema exists in
    generated_registry.json at all -- only node type/version + the
    resource/operation menu were captured by the generator. Real
    parameter collection will need to read nodes.json's `properties`
    arrays directly; this class stays a no-op placeholder until that
    lands, rather than filling from the wrong source.
    """

    _PLACEHOLDER_BY_TYPE = {
        "string": "PLACEHOLDER",
        "boolean": False,
        "number": 0,
        "options": None,  # filled from field's own default/options if present
    }

    def get_params(
        self, step: Step, resolved: ResolvedNode, field_defs: list[dict[str, Any]]
    ) -> dict[str, Any]:
        params: dict[str, Any] = {}

        if step.resource:
            params["resource"] = step.resource
        if step.operation:
            params["operation"] = step.operation

        for f in field_defs:
            if not f.get("required"):
                continue
            name = f["name"]
            ftype = f.get("type", "string")
            if "default" in f and f["default"] not in (None, ""):
                params[name] = f["default"]
            else:
                params[name] = self._PLACEHOLDER_BY_TYPE.get(ftype, "PLACEHOLDER")

        return params


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
