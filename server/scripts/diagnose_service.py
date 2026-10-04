"""
diagnose_service.py <node-name-substring> [more substrings...]

Shows, for every node whose short name contains the substring, exactly how
generate_registry.py groups it: which credential it resolves as PRIMARY and
why, whether that credential is treated as abstract, the service key it would
derive, what else shares that primary credential (is it a multi-node hub?),
and which services in the CURRENT generated_registry.json reference the node.

Run from server\\scripts:   python diagnose_service.py googleSheets
Read-only. Writes nothing.
"""

import json
import sys
from pathlib import Path

import generate_registry as g


def main(args):
    if not args:
        print(__doc__)
        return 1
    nodes, creds = g.load()
    creds_by_name = g.index_creds(creds)

    generic = {c["name"] for c in creds if c.get("genericAuth")}
    extended = {e for c in creds for e in (c.get("extends") or [])}
    used = {cn for n in nodes for cn in g.all_credential_names_on_node(n)}
    abstract = {
        c["name"]
        for c in creds
        if c["name"] in generic or (c["name"] in extended and c["name"] not in used)
    }

    # recompute primary-credential groups exactly like main() does
    primary_of = {}
    groups = {}
    for n in nodes:
        if not (n.get("credentials") or []):
            continue
        p = g.resolve_primary_credential(n)
        if p in abstract:
            alt = next(
                (c["name"] for c in n["credentials"] if c["name"] not in abstract), None
            )
            if alt is None:
                continue
            p = alt
        primary_of[n["name"]] = p
        groups.setdefault(p, []).append(n)

    registry_path = g.OUT_PATH
    registry = (
        json.load(open(registry_path, encoding="utf-8"))
        if registry_path.exists()
        else {}
    )

    needles = [a.lower() for a in args]
    hits = [
        n
        for n in nodes
        if any(nd in g.node_short_key(n["name"]).lower() for nd in needles)
    ]
    if not hits:
        print("No node short name contains", args)
        return 1

    for n in sorted(hits, key=lambda x: x["name"]):
        short = g.node_short_key(n["name"])
        print("=" * 78)
        print(
            f"NODE      {n['name']}   version={n.get('version')}   group={n.get('group')}"
        )
        print(f"ROLE      {g.node_role(n)}    kind={g.classify_node_kind(n)}")
        print("CREDENTIALS ON NODE:")
        for c in n.get("credentials") or []:
            print(
                f"   - {c['name']:34} required={c.get('required')}  show={((c.get('displayOptions') or {}).get('show'))}"
            )
            print(f"       abstract={c['name'] in abstract}")
        sel = None
        keys = set()
        for c in n.get("credentials") or []:
            keys.update(((c.get("displayOptions") or {}).get("show") or {}).keys())
        for p in n.get("properties") or []:
            if p.get("name") in keys:
                sel = (p.get("name"), p.get("default"))
                break
        print(f"AUTH SELECTOR (name, default): {sel}")
        prim = primary_of.get(n["name"])
        print(f"PRIMARY CREDENTIAL (after abstract fallback): {prim}")
        if prim:
            members = [g.node_short_key(m["name"]) for m in groups[prim]]
            bases = {g.base_product_name(m) for m in members}
            hub = not g.same_product_family(bases)
            key = g.snake_case(prim) if hub else g.snake_case(sorted(bases)[0])
            print(f"GROUP of nodes sharing that primary: {members}")
            print(f"   base product names: {sorted(bases)}   multi-product hub: {hub}")
            print(f"   => derived SERVICE KEY: {key}")
        full = n["name"]
        holders = [
            k
            for k, v in registry.items()
            if isinstance(v, dict) and full in json.dumps(v.get("nodes", {}))
        ]
        print(
            f"SERVICES IN CURRENT generated_registry.json REFERENCING THIS NODE: {holders or 'NONE'}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
