"""
app/compiler/param_schema.py

Reads scripts/nodes.json (or wherever it's placed in the real repo --
confirm the path in _NODES_JSON_PATH) directly to answer: "for this
resolved node, at this typeVersion, with this resource/operation, which
parameters does the user need to fill in before this step can run?"

This does NOT exist in generated_registry.json (confirmed empirically --
that file only captured node type/version + the resource/operation MENU,
not each operation's own parameter schema). nodes.json's raw `properties`
array is the only place this data lives, and it's messier than the
registry's cleaned-up shape:

- A field can appear TWICE under the same name, gated by different
  `displayOptions.show`/`hide` on "@version" (e.g. Gmail's `emailType`
  has one copy for @version==2 and another for every other version) --
  callers must filter by the resolved node's actual typeVersion or they
  get duplicate/wrong-version fields.
- Fields inside a `collection`/`fixedCollection` type (e.g. Gmail Send's
  "Options" -> BCC/CC/Sender Name/...) are optional extras nested one
  level down, not top-level required parameters -- this module only
  surfaces the top-level list of `required: true` fields, matching what
  the "Parameter X is required" errors you saw in the n8n UI actually
  check.
- `displayOptions.show`/`hide` keys can reference `resource`, `operation`,
  `@version`, or (inside nested collections only, not handled here)
  another sibling parameter with a leading "/" -- e.g. "/operation".

USAGE (per step, once resource/operation are resolved):
    fields = get_required_params("n8n-nodes-base.gmail", 2.2, "message", "send")
    # -> [FieldDef(name="sendTo", display_name="To", type="string", ...),
    #     FieldDef(name="subject", ...), FieldDef(name="message", ...)]

This is what the frontend calls (via a new endpoint, not built here) right
when the user clicks "Create Workflow" -- one call per resolved step -- to
render the actual parameter-entry form, BEFORE compile() ever runs.
compile() then receives real user-typed values via Overrides, not
placeholders.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

# Adjust to wherever nodes.json actually lives in the real repo -- your
# tree shows it at scripts/nodes.json today. If it moves (e.g. into
# app/utils/ alongside generated_registry.json), only this line changes.
_NODES_JSON_PATH = (
    Path(__file__).resolve().parent.parent.parent / "scripts" / "nodes.json"
)

_SKIP_FIELD_NAMES = {"resource", "operation", "authentication"}
_SKIP_FIELD_TYPES = {"collection", "fixedCollection"}


@dataclass
class FieldOption:
    label: str
    value: Any


@dataclass
class FieldDef:
    name: str
    display_name: str
    type: str
    required: bool
    default: Any = None
    placeholder: Optional[str] = None
    description: Optional[str] = None
    options: list[FieldOption] = field(default_factory=list)


@lru_cache(maxsize=1)
def _load_nodes() -> list[dict[str, Any]]:
    with open(_NODES_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def reload_nodes() -> None:
    _load_nodes.cache_clear()


def _get_node_def(node_type: str, type_version: float) -> Optional[dict[str, Any]]:
    """
    nodes.json can have MULTIPLE entries for the same `name` (node type) --
    e.g. Gmail has a [2, 2.1, 2.2] entry and a separate legacy [1] entry.
    Pick the one whose `version` list contains the resolved typeVersion.
    """
    candidates = [n for n in _load_nodes() if n.get("name") == node_type]
    for n in candidates:
        versions = n.get("version")
        if isinstance(versions, list) and type_version in versions:
            return n
        if versions == type_version:
            return n
    # Fall back to the entry whose defaultVersion matches, if no exact
    # version-list match (shouldn't normally happen once resolved from
    # the registry, but don't silently return nothing on a near-miss).
    for n in candidates:
        if n.get("defaultVersion") == type_version:
            return n
    return None


def _display_options_match(
    display_options: dict[str, Any],
    resource: Optional[str],
    operation: Optional[str],
    type_version: float,
) -> bool:
    show = display_options.get("show", {})
    hide = display_options.get("hide", {})

    def _check(conditions: dict[str, Any], want_present: bool) -> bool:
        for key, values in conditions.items():
            if key == "@version":
                is_match = type_version in values
            elif key == "resource":
                is_match = resource is not None and resource in values
            elif key == "operation":
                is_match = operation is not None and operation in values
            else:
                # A condition on some other sibling parameter (nested-
                # collection fields only, e.g. "/operation") -- this
                # module only walks top-level properties, where that
                # shouldn't occur; skip rather than wrongly exclude.
                continue
            if want_present and not is_match:
                return False
            if not want_present and is_match:
                return False
        return True

    return _check(show, want_present=True) and _check(hide, want_present=False)


def get_required_params(
    node_type: str,
    type_version: float,
    resource: Optional[str],
    operation: Optional[str],
) -> list[FieldDef]:
    """
    Top-level, `required: true` fields for this exact node/version/
    resource/operation combination. Skips resource/operation/authentication
    selectors themselves (already resolved by the compiler) and nested
    collection/fixedCollection fields (optional extras).
    """
    node_def = _get_node_def(node_type, type_version)
    if node_def is None:
        return []

    seen_names: set[str] = set()
    results: list[FieldDef] = []

    for prop in node_def.get("properties", []):
        name = prop.get("name")
        if not name or name in _SKIP_FIELD_NAMES:
            continue
        if prop.get("type") in _SKIP_FIELD_TYPES:
            continue
        if not prop.get("required"):
            continue
        display_options = prop.get("displayOptions", {})
        if not _display_options_match(
            display_options, resource, operation, type_version
        ):
            continue
        if name in seen_names:
            # Version-aware filtering above should already prevent this,
            # but never silently duplicate a field in the rendered form.
            continue
        seen_names.add(name)

        options = [
            FieldOption(label=o.get("name", o.get("value")), value=o.get("value"))
            for o in prop.get("options", [])
            if isinstance(o, dict) and "value" in o
        ]

        results.append(
            FieldDef(
                name=name,
                display_name=prop.get("displayName", name),
                type=prop.get("type", "string"),
                required=True,
                default=prop.get("default"),
                placeholder=prop.get("placeholder"),
                description=prop.get("description"),
                options=options,
            )
        )

    return results
