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
import re
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
_SKIP_FIELD_TYPES = {"collection", "fixedCollection", "resourceMapper"}

# displayOptions keys that describe the node's own structure rather than an
# authentication selector (used when mapping a credential type to the
# parameter that makes the node look for it -- see auth_params_for_credential).
_NON_AUTH_DISPLAY_KEYS = {"@version", "resource", "operation"}


@dataclass
class FieldOption:
    label: str
    value: Any


@dataclass
class FieldMode:
    """One input mode of an n8n resourceLocator field (list / url / id / name).
    `regexes` are the mode's own validation patterns from nodes.json -- the
    evidence compile-time mode inference relies on."""

    name: str
    display_name: str
    placeholder: Optional[str] = None
    regexes: list[str] = field(default_factory=list)


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
    # Only populated for type == "resourceLocator".
    modes: list[FieldMode] = field(default_factory=list)


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


def _cnd_match(actual: Any, cnd: dict[str, Any]) -> bool:
    """n8n's {"_cnd": {...}} operator form inside displayOptions values,
    e.g. "@version": [{"_cnd": {"gte": 2.1}}]. An operator this module
    doesn't know is treated as satisfied -- never wrongly hide a field."""
    for op, expected in cnd.items():
        if op == "eq":
            ok = actual == expected
        elif op == "not":
            ok = actual != expected
        elif op in ("gte", "lte", "gt", "lt"):
            try:
                a, e = float(actual), float(expected)
            except (TypeError, ValueError):
                return False
            ok = {"gte": a >= e, "lte": a <= e, "gt": a > e, "lt": a < e}[op]
        elif op == "includes":
            ok = (
                isinstance(actual, str)
                and isinstance(expected, str)
                and expected in actual
            )
        elif op == "startsWith":
            ok = (
                isinstance(actual, str)
                and isinstance(expected, str)
                and actual.startswith(expected)
            )
        elif op == "endsWith":
            ok = (
                isinstance(actual, str)
                and isinstance(expected, str)
                and actual.endswith(expected)
            )
        elif op == "regex":
            try:
                ok = re.search(str(expected), str(actual)) is not None
            except re.error:
                ok = True
        elif op == "exists":
            ok = (actual is not None) == bool(expected)
        else:
            ok = True
        if not ok:
            return False
    return True


def _value_matches(actual: Any, expected: Any) -> bool:
    """True if `actual` equals any entry of n8n's list-of-allowed-values,
    where an entry may also be a {"_cnd": {...}} operator dict."""
    if not isinstance(expected, list):
        expected = [expected]
    for e in expected:
        if isinstance(e, dict) and "_cnd" in e:
            if _cnd_match(actual, e["_cnd"]):
                return True
        elif actual == e:
            return True
    return False


def _display_options_match(
    display_options: dict[str, Any],
    resource: Optional[str],
    operation: Optional[str],
    type_version: float,
    siblings: Optional[dict[str, Any]] = None,
) -> bool:
    """
    `siblings` maps other top-level parameter names to the value they will
    have when the node is created (their n8n defaults). A condition on such
    a parameter (e.g. Slack's messageType, which decides whether the
    plain-text field or the Block Kit field applies) is evaluated against
    it. Before this, any condition on a parameter other than resource/
    operation/@version was skipped (= treated as satisfied), so fields n8n
    itself would hide showed up -- and, being "required", blocked the form.
    A sibling that is unknown or has no default is still skipped.
    """
    show = display_options.get("show", {})
    hide = display_options.get("hide", {})

    def _lookup(key: str) -> tuple[bool, Any]:
        if key == "@version":
            return True, type_version
        if key.startswith("@"):
            return False, None
        k = key[1:] if key.startswith("/") else key
        if k == "resource":
            return True, resource
        if k == "operation":
            return True, operation
        if siblings is not None and "." not in k and k in siblings:
            return True, siblings[k]
        return False, None

    def _check(conditions: dict[str, Any], want_present: bool) -> bool:
        for key, values in conditions.items():
            known, actual = _lookup(key)
            if not known:
                continue  # unknown condition: skip rather than wrongly exclude
            is_match = actual is not None and _value_matches(actual, values)
            if want_present and not is_match:
                return False
            if not want_present and is_match:
                return False
        return True

    return _check(show, want_present=True) and _check(hide, want_present=False)


def _effective_default(prop: dict[str, Any]) -> Any:
    """The value a parameter really has when the node is created/shown.
    An `options` parameter whose declared default is not one of its options
    (Slack's "Send Message To" declares '') is displayed with its first
    option selected, so that is the effective value -- both for the form's
    initial state and for evaluating other fields' displayOptions."""
    default = prop.get("default")
    if prop.get("type") == "options":
        values = [
            o.get("value")
            for o in prop.get("options", [])
            if isinstance(o, dict) and "value" in o
        ]
        if values and default not in values:
            return values[0]
    return default


def _sibling_defaults(
    properties: list[dict[str, Any]],
    resource: Optional[str],
    operation: Optional[str],
    type_version: float,
) -> dict[str, Any]:
    """Name -> default for every top-level parameter that applies to this
    resource/operation/version (first applicable copy wins). Only the plain
    resource/operation/@version gating is used here, so this can't recurse."""
    out: dict[str, Any] = {}
    for prop in properties:
        name = prop.get("name")
        if not name or name in out:
            continue
        default = _effective_default(prop)
        if default is None or default == "":
            continue  # no usable value -> conditions on it stay skipped
        if not _display_options_match(
            prop.get("displayOptions", {}), resource, operation, type_version
        ):
            continue
        out[name] = default
    return out


def _form_default(prop_type: str, default: Any) -> Any:
    """A default the form can safely seed an input with. Object-shaped
    defaults (a resourceLocator's {"mode": "list", "value": ""}) became the
    literal text "[object Object]" once stringified client-side."""
    if prop_type == "resourceLocator":
        if isinstance(default, dict) and isinstance(default.get("value"), str):
            return default["value"]
        return ""
    if isinstance(default, dict) or (
        isinstance(default, list) and prop_type != "multiOptions"
    ):
        return ""
    return default


def _build_modes(prop: dict[str, Any]) -> list[FieldMode]:
    modes: list[FieldMode] = []
    for m in prop.get("modes") or []:
        if not isinstance(m, dict) or not m.get("name"):
            continue
        regexes: list[str] = []
        for v in m.get("validation") or []:
            if isinstance(v, dict) and v.get("type") == "regex":
                rx = (v.get("properties") or {}).get("regex")
                if isinstance(rx, str):
                    regexes.append(rx)
        modes.append(
            FieldMode(
                name=m["name"],
                display_name=m.get("displayName", m["name"]),
                placeholder=m.get("placeholder"),
                regexes=regexes,
            )
        )
    return modes


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

    siblings = _sibling_defaults(
        node_def.get("properties", []), resource, operation, type_version
    )

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
            display_options, resource, operation, type_version, siblings
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
                default=_form_default(
                    prop.get("type", "string"), _effective_default(prop)
                ),
                placeholder=prop.get("placeholder"),
                description=prop.get("description"),
                options=options,
                modes=(
                    _build_modes(prop) if prop.get("type") == "resourceLocator" else []
                ),
            )
        )

    return results


# ---------------------------------------------------------------------------
# Compile-time helpers: shape the values the form collected into what n8n
# actually stores, and add the structural parameters it needs.
# ---------------------------------------------------------------------------


def infer_locator_mode(modes: list[FieldMode], value: str) -> Optional[str]:
    """
    Which resourceLocator mode a typed/pasted value belongs to, decided from
    the node's own per-mode validation regexes (nodes.json), not from any
    service-specific rule:
      * an n8n expression ("=...") -> the "id" mode if there is one;
      * a mode whose regex(es) fully match the value ("url" wins a tie,
        since a URL is the most structured form);
      * otherwise the first mode with no validation (typically "name");
      * otherwise the first non-list mode.
    "list" is never chosen: it needs a value picked from n8n's own dropdown.
    Known limit: a plain word can satisfy a loose "id" pattern (a Slack
    channel called "general"); an explicit mode picker is the real fix.
    """
    candidates = [m for m in modes if m.name != "list"]
    if not candidates:
        return None
    if value.startswith("="):
        return next((m.name for m in candidates if m.name == "id"), candidates[0].name)
    matching = []
    for m in candidates:
        if not m.regexes:
            continue
        try:
            if all(re.fullmatch(rx, value) for rx in m.regexes):
                matching.append(m)
        except re.error:
            continue  # JS-only regex syntax: can't evaluate, ignore this mode
    if matching:
        matching.sort(key=lambda m: 0 if m.name == "url" else 1)
        return matching[0].name
    plain = [m for m in candidates if not m.regexes]
    if plain:
        return next((m.name for m in plain if m.name == "name"), plain[0].name)
    return candidates[0].name


def normalize_param_values(
    field_defs: list[FieldDef], params: dict[str, Any]
) -> dict[str, Any]:
    """Wrap each resourceLocator value as n8n stores it:
    {"__rl": true, "mode": <url|id|name>, "value": <text>}. A bare string
    (what the form collects) gets its mode inferred; empty values are left
    alone for the required-field check to deal with."""
    out = dict(params)
    for fd in field_defs:
        if fd.type != "resourceLocator" or fd.name not in out:
            continue
        v = out[fd.name]
        inner: Any = v.get("value") if isinstance(v, dict) else v
        if not isinstance(inner, str) or not inner.strip():
            continue
        inner = inner.strip()
        mode = v.get("mode") if isinstance(v, dict) else None
        if not isinstance(mode, str) or mode == "list":
            mode = infer_locator_mode(fd.modes, inner)
        if mode:
            out[fd.name] = {"__rl": True, "mode": mode, "value": inner}
    return out


def get_structural_defaults(
    node_type: str,
    type_version: float,
    resource: Optional[str],
    operation: Optional[str],
) -> dict[str, Any]:
    """
    Parameters that aren't "required" (so never shown on the form) but whose
    n8n default is the wrong one for an unattended workflow. Today: every
    resourceMapper field that applies to this operation (e.g. the Google
    Sheets "Columns" mapping) is set to "map automatically from the
    incoming data" instead of n8n's "define each column manually", unless
    the node says it doesn't support auto-mapping.
    """
    node_def = _get_node_def(node_type, type_version)
    if node_def is None:
        return {}
    props = node_def.get("properties", [])
    siblings = _sibling_defaults(props, resource, operation, type_version)
    out: dict[str, Any] = {}
    for prop in props:
        if prop.get("type") != "resourceMapper":
            continue
        name = prop.get("name")
        if not name or name in out:
            continue
        if not _display_options_match(
            prop.get("displayOptions", {}), resource, operation, type_version, siblings
        ):
            continue
        rm = (prop.get("typeOptions") or {}).get("resourceMapper") or {}
        if rm.get("supportAutoMap") is False:
            continue
        out[name] = {
            "mappingMode": "autoMapInputData",
            "value": None,
            "matchingColumns": [],
            "schema": [],
            "attemptToConvertTypes": False,
            "convertFieldsToString": False,
        }
    return out


def auth_params_for_credential(
    node_type: str, type_version: float, credential_type: str
) -> Optional[dict[str, Any]]:
    """
    The parameter value(s) that make this node look for `credential_type`.
    n8n nodes with several credential types carry a selector (Slack's
    `authentication`: accessToken -> slackApi, oAuth2 -> slackOAuth2Api;
    Google Sheets: oAuth2 / serviceAccount; Facebook uses `authType`). The
    mapping is in the node's own `credentials[].displayOptions.show`, so it
    is read from there -- nothing service-specific. Without it the node
    keeps its default selector and reports the OTHER credential as missing.

    Returns {} when no selector is involved or the node isn't in nodes.json,
    and None when the node IS known but does not accept this credential type
    at all (the caller should warn: that workflow cannot activate).
    """
    node_def = _get_node_def(node_type, type_version)
    if node_def is None:
        return {}
    entries = [
        c
        for c in (node_def.get("credentials") or [])
        if c.get("name") == credential_type
    ]
    matched = None
    for c in entries:
        show = (c.get("displayOptions") or {}).get("show") or {}
        ver = show.get("@version")
        if ver is not None and not _value_matches(type_version, ver):
            continue
        matched = c
        break
    if matched is None:
        return None
    prop_names = {p.get("name") for p in node_def.get("properties", [])}
    show = (matched.get("displayOptions") or {}).get("show") or {}
    params: dict[str, Any] = {}
    for key, values in show.items():
        if (
            key in _NON_AUTH_DISPLAY_KEYS
            or key.startswith("@")
            or key not in prop_names
        ):
            continue
        if isinstance(values, list) and values and not isinstance(values[0], dict):
            params[key] = values[0]
    return params
