r"""
scripts/check_credential_required.py

Empirical check for credential_required(node_type, type_version) -- no server,
no auth. Run from server\ :

  python scripts\check_credential_required.py
  python scripts\check_credential_required.py --sweep
  python scripts\check_credential_required.py --nodes D:\path\to\nodes.json
  python scripts\check_credential_required.py --node n8n-nodes-base.slack

Default mode: runs a fixed list of nodes through credential_required() and
prints, side by side, the function's answer and the node's RAW `credentials`
block from nodes.json. Only the cases the project has stated as fact are
asserted (Gmail needs a credential; If/Switch/Merge/Set/Code/NoOp/Filter/Wait
don't). Everything else is informational. Exit code 1 on any failed assertion.

--sweep: runs every UNIQUE node in nodes.json (one entry per name, chosen the
same way as the default mode) and lists where the function disagrees with the
raw block. A credential with a displayOptions gate (e.g. Wait's webhook auth)
is marked "(conditional)" and does NOT count as an unconditional requirement,
so the sweep reports two different kinds of disagreement:
  OVER   function says True but no credential is unconditionally required.
         Split by the node's `authentication` property:
           ALTERNATIVES  one of several auth methods must be picked (Airtable,
                         AWS, Asana ...) -- True is correct
           OPTIONAL      auth defaults to / offers "none" (Wait, HTTP Request,
                         Form Trigger ...) -- True may over-demand; these are
                         the ones worth a look
           OTHER         conditional on something else; the gating keys are shown
  UNDER  function says False but a credential is unconditionally required
A disagreement is not automatically a bug -- the function may know something
the raw block doesn't -- it is where to look first.

--propose: PREDICTS the effect of a candidate rule before param_schema.py is
touched. Candidate: a credential gated by a selector (displayOptions.show on
`authentication`, `authType`, `resource`, ...) counts as required only if that
selector's DEFAULT value selects it. Anything unclear (unknown property,
operator conditions, differing defaults) stays required. Lists every node whose
answer would flip True -> False, and flags any node that was in the
ALTERNATIVES group (pick-one-auth, must stay True) and would flip.
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.compiler.param_schema import credential_required  # noqa: E402

DEFAULT_NODES = Path(__file__).resolve().parent / "nodes.json"

# (node name, expected) -- expected None means "just show me".
CASES = [
    ("n8n-nodes-base.gmail", True),
    ("n8n-nodes-base.if", False),
    ("n8n-nodes-base.switch", False),
    ("n8n-nodes-base.merge", False),
    ("n8n-nodes-base.set", False),
    ("n8n-nodes-base.code", False),
    ("n8n-nodes-base.noOp", False),
    ("n8n-nodes-base.filter", False),
    ("n8n-nodes-base.wait", False),
    ("n8n-nodes-base.slack", None),
    ("n8n-nodes-base.googleSheets", None),
    ("n8n-nodes-base.httpRequest", None),
    ("n8n-nodes-base.scheduleTrigger", None),
    ("n8n-nodes-base.gmailTrigger", None),
    ("@n8n/n8n-nodes-langchain.agent", None),
    ("@n8n/n8n-nodes-langchain.lmChatGroq", None),
    ("n8n-nodes-base.thisNodeDoesNotExist", None),
]


def load_nodes(path: Path) -> list[dict]:
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    if isinstance(raw, dict):
        raw = list(raw.values())
    return [n for n in raw if isinstance(n, dict)]


def versions_of(entry: dict) -> list[float]:
    v = entry.get("version")
    if isinstance(v, list):
        return [float(x) for x in v if isinstance(x, (int, float))]
    if isinstance(v, (int, float)):
        return [float(v)]
    return []


def pick_version(entry: dict) -> float:
    d = entry.get("defaultVersion")
    if isinstance(d, (int, float)):
        return float(d)
    vs = versions_of(entry)
    return max(vs) if vs else 1.0


def pick_entry(nodes: list[dict], name: str) -> dict | None:
    """nodes.json is not deduplicated by version: prefer the entry whose
    version list contains its own defaultVersion (the current one)."""
    same = [n for n in nodes if n.get("name") == name]
    if not same:
        return None
    for n in same:
        if pick_version(n) in versions_of(n):
            return n
    return same[0]


def raw_creds(entry: dict | None) -> list[dict]:
    creds = (entry or {}).get("credentials")
    return [c for c in creds if isinstance(c, dict)] if isinstance(creds, list) else []


def raw_summary(entry: dict | None) -> str:
    if entry is None:
        return "(node not in nodes.json)"
    creds = raw_creds(entry)
    if not creds:
        return "[] (no credentials block)"
    return (
        "["
        + ", ".join(
            f"{c.get('name')} required={c.get('required')}"
            + (" (conditional)" if c.get("displayOptions") else "")
            for c in creds
        )
        + "]"
    )


def run_cases(nodes: list[dict], only: str | None) -> int:
    failures = 0
    cases = [(only, None)] if only else CASES
    for name, expected in cases:
        entry = pick_entry(nodes, name)
        version = pick_version(entry) if entry else 1.0
        got = credential_required(name, version)
        if expected is None:
            status = "INFO"
        elif got == expected:
            status = "OK"
        else:
            status = "MISMATCH"
            failures += 1
        print(f"{status:8} {name} v{version:g}")
        print(
            f"         credential_required -> {got}   raw credentials: {raw_summary(entry)}"
        )
        if status == "MISMATCH":
            print(f"         expected {expected}")
    return failures


def unconditional(entry: dict) -> bool:
    """Any credential that is required and not gated by displayOptions."""
    return any(
        c.get("required") is True and not c.get("displayOptions")
        for c in raw_creds(entry)
    )


NONE_VALUES = {"none", "noAuth", "noauth"}


def auth_property(entry: dict) -> dict | None:
    for prop in entry.get("properties") or []:
        if isinstance(prop, dict) and prop.get("name") == "authentication":
            return prop
    return None


def classify_over(entry: dict) -> str:
    prop = auth_property(entry)
    if prop is None:
        return "OTHER"
    values = {
        o.get("value") for o in (prop.get("options") or []) if isinstance(o, dict)
    }
    if prop.get("default") in NONE_VALUES or values & NONE_VALUES:
        return "OPTIONAL"
    return "ALTERNATIVES"


def gating_keys(entry: dict) -> str:
    keys: set[str] = set()
    for c in raw_creds(entry):
        show = (c.get("displayOptions") or {}).get("show") or {}
        keys.update(show.keys())
    return ",".join(sorted(keys)) or "?"


_UNKNOWN = object()


def default_values(entry: dict) -> dict:
    """name -> default for the node's top-level properties. A name that appears
    more than once with different defaults is marked unknown."""
    out: dict = {}
    for prop in entry.get("properties") or []:
        if not isinstance(prop, dict) or "name" not in prop:
            continue
        name, d = prop["name"], prop.get("default", _UNKNOWN)
        if name in out and out[name] != d:
            out[name] = _UNKNOWN
        else:
            out[name] = d
    return out


def selected_by_default(entry: dict, cred: dict, version: float) -> bool:
    """True when this credential applies with the node's default parameters.
    Conservative: anything it cannot evaluate counts as applying."""
    show = (cred.get("displayOptions") or {}).get("show") or {}
    defaults = default_values(entry)
    for key, allowed in show.items():
        if key == "@version":
            vals = (
                [a for a in allowed if isinstance(a, (int, float))]
                if isinstance(allowed, list)
                else []
            )
            if (
                isinstance(allowed, list)
                and len(vals) == len(allowed)
                and version not in vals
            ):
                return False
            continue
        if key.startswith("@") or not isinstance(allowed, list):
            continue
        if any(isinstance(a, dict) for a in allowed):
            continue  # operator conditions: cannot evaluate, assume it applies
        value = defaults.get(key, _UNKNOWN)
        if value is _UNKNOWN or isinstance(value, (dict, list)):
            continue
        if value not in allowed:
            return False
    return True


def proposed_required(entry: dict, version: float) -> bool:
    return any(
        c.get("required") is True and selected_by_default(entry, c, version)
        for c in raw_creds(entry)
    )


def run_propose(nodes: list[dict], limit: int = 60) -> None:
    names = sorted({n["name"] for n in nodes if isinstance(n.get("name"), str)})
    flips_off: list[tuple] = []  # function True -> proposed False
    flips_on: list[tuple] = []  # function False -> proposed True
    for name in names:
        entry = pick_entry(nodes, name)
        if entry is None:
            continue
        version = pick_version(entry)
        got = credential_required(name, version)
        new = proposed_required(entry, version)
        if got and not new:
            cls = (
                classify_over(entry)
                if raw_creds(entry) and not unconditional(entry)
                else "n/a"
            )
            flips_off.append((name, version, cls, entry))
        elif not got and new:
            flips_on.append((name, version, entry))

    print(f"{len(names)} unique nodes")
    print(f"\nfunction True -> proposed False: {len(flips_off)}")
    by_cls: dict[str, int] = {}
    for _, _, cls, _ in flips_off:
        by_cls[cls] = by_cls.get(cls, 0) + 1
    print("  by group: " + ", ".join(f"{k}={v}" for k, v in sorted(by_cls.items())))
    risky = [r for r in flips_off if r[2] == "ALTERNATIVES"]
    print(f"  !! ALTERNATIVES that would flip (should be 0): {len(risky)}")
    for name, v, cls, entry in risky[:limit]:
        print(
            f"     {name} v{v:g}  defaults: "
            + ", ".join(
                f"{k}={default_values(entry).get(k)!r}"
                for k in ("authentication", "authType")
            )
        )
    print("  flips:")
    for name, v, cls, entry in flips_off[:limit]:
        print(f"     [{cls}] {name} v{v:g}")
    if len(flips_off) > limit:
        print(f"     ... {len(flips_off) - limit} more (raise --limit)")
    print(f"\nfunction False -> proposed True (should be 0): {len(flips_on)}")
    for name, v, entry in flips_on[:limit]:
        print(f"     {name} v{v:g}  {raw_summary(entry)}")


def run_sweep(nodes: list[dict], limit: int = 40) -> None:
    names = sorted({n["name"] for n in nodes if isinstance(n.get("name"), str)})
    dupes = len(nodes) - len(names)
    over: dict[str, list[tuple]] = {"ALTERNATIVES": [], "OPTIONAL": [], "OTHER": []}
    under: list[tuple] = []
    yes = 0
    for name in names:
        entry = pick_entry(nodes, name)
        if entry is None:
            continue
        version = pick_version(entry)
        got = credential_required(name, version)
        yes += bool(got)
        raw = unconditional(entry)
        if got and not raw and raw_creds(entry):
            over[classify_over(entry)].append((name, version, entry))
        elif not got and raw:
            under.append((name, version, raw_summary(entry)))
    print(
        f"{len(nodes)} entries = {len(names)} unique nodes + {dupes} duplicate version groups"
    )
    print(f"credential_required=True for {yes}, False for {len(names) - yes}")

    print(f"\nUNDER (function False, unconditional credential exists): {len(under)}")
    for name, v, summary in under[:limit]:
        print(f"  {name} v{v:g}  {summary}")

    total_over = sum(len(v) for v in over.values())
    print(f"\nOVER (function True, no unconditional credential): {total_over}")
    print(
        f"  ALTERNATIVES (pick one auth method; True is correct): {len(over['ALTERNATIVES'])}"
    )
    for label in ("OPTIONAL", "OTHER"):
        rows = over[label]
        note = (
            "auth defaults to / offers 'none': worth a look"
            if label == "OPTIONAL"
            else "gated by something else"
        )
        print(f"  {label} ({note}): {len(rows)}")
        for name, v, entry in rows[:limit]:
            extra = "" if label == "OPTIONAL" else f"  gated by: {gating_keys(entry)}"
            print(f"    {name} v{v:g}  {raw_summary(entry)}{extra}")
        if len(rows) > limit:
            print(f"    ... {len(rows) - limit} more (raise --limit)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nodes", type=Path, default=DEFAULT_NODES)
    ap.add_argument("--node", help="check a single node name")
    ap.add_argument("--sweep", action="store_true")
    ap.add_argument(
        "--propose", action="store_true", help="predict a default-selector rule"
    )
    ap.add_argument("--limit", type=int, default=40)
    args = ap.parse_args()

    if not args.nodes.exists():
        sys.exit(f"nodes.json not found at {args.nodes} (use --nodes)")
    nodes = load_nodes(args.nodes)
    print(f"loaded {len(nodes)} entries from {args.nodes}\n")

    if args.propose:
        run_propose(nodes, args.limit)
        return
    if args.sweep:
        run_sweep(nodes, args.limit)
        return

    failures = run_cases(nodes, args.node)
    print(f"\nassertion failures: {failures}", file=sys.stderr)
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
