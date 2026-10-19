"""
scripts/verify_routing.py -- read-only structural check of a compiled workflow.

    python scripts/verify_routing.py scripts/out_leave.json

Checks (universal, no service names): every Switch has an 'extra' fallback
output wired to a NoOp sink and equals-rules on a DECISION marker; every agent
prompt ends with its routing rule when it has one; every non-AI node is
reachable from a trigger. Prints PASS/FAIL/INFO lines; exit code 1 on any FAIL.
"""

import json
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "scripts/out_leave.json"
d = json.load(open(path, encoding="utf-8-sig"))
d = d.get("workflow_json", d)
nodes = {n["name"]: n for n in d["nodes"]}
conns = d.get("connections", {})
failed = False


def check(ok, label, detail=""):
    global failed
    failed = failed or not ok
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f"  -> {detail}" if detail else ""))


def info(label):
    print(f"INFO  {label}")


# ---- switches --------------------------------------------------------------
for sw in (n for n in d["nodes"] if n["type"].endswith(".switch")):
    p = sw["parameters"]
    rules = p.get("rules", {}).get("values", [])
    outs = conns.get(sw["name"], {}).get("main", [])
    print(f"\n== {sw['name']}  ({len(rules)} rules)")
    check(
        p.get("options", {}).get("fallbackOutput") == "extra", "fallbackOutput = extra"
    )
    check(len(outs) == len(rules) + 1, "has rules + 1 outputs", f"found {len(outs)}")
    if len(outs) == len(rules) + 1:
        tgt = [t["node"] for t in outs[-1]]
        sink_ok = bool(tgt) and all(
            nodes[t]["type"].endswith(".noOp") for t in tgt if t in nodes
        )
        check(
            sink_ok,
            "fallback output wired to a NoOp sink",
            ", ".join(tgt) or "unconnected",
        )
    for i, r in enumerate(rules):
        c = r["conditions"]["conditions"][0]
        label = r.get("outputKey", i)
        check(c["operator"].get("operation") == "equals", f"rule '{label}' uses equals")
        check(
            "DECISION" in c["leftValue"] and "pop()" in c["leftValue"],
            f"rule '{label}' reads the last DECISION marker",
        )
        targets = [t["node"] for t in outs[i]] if i < len(outs) else []
        if targets:
            info(f"'{label}' -> {', '.join(targets)}")
        else:
            info(f"'{label}' -> (unconnected: the item is ignored on this branch)")

# ---- agents ----------------------------------------------------------------
for ag in (n for n in d["nodes"] if n["type"].endswith(".agent")):
    text = ag["parameters"].get("text", "")
    print(f"\n== {ag['name']}")
    has_trig = "Original trigger data" in text
    has_route = "Routing rule" in text
    check("Input data" in text, "has an Input data block")
    if has_trig:
        check(
            text.index("Input data") < text.index("Original trigger data"),
            "trigger data comes after Input data",
        )
        check(
            "$('" in text and ").first().json" in text,
            "trigger data uses a named-node reference",
        )
        info("behind another step: gets the original trigger item")
    else:
        info("no trigger-data block (directly after trigger, or a generic trigger)")
    if has_route:
        check(
            text.rindex("Routing rule") > text.index("Input data"),
            "routing rule comes after the data",
        )
        check(
            text.rstrip().endswith("input data."),
            "routing rule is the last thing in the prompt",
        )
    else:
        info("no routing rule (not a branching step)")

# ---- reachability ----------------------------------------------------------
edges, ai_sources = {}, set()
for src, by_type in conns.items():
    for typ, outputs in by_type.items():
        for branch in outputs:
            for t in branch or []:
                if typ == "main":
                    edges.setdefault(src, set()).add(t["node"])
                else:
                    ai_sources.add(src)
seen = [n["name"] for n in d["nodes"] if n["type"].lower().endswith("trigger")]
stack = list(seen)
reach = set(seen)
while stack:
    for nxt in edges.get(stack.pop(), ()):
        if nxt not in reach:
            reach.add(nxt)
            stack.append(nxt)
print("\n== reachability")
orphans = [n for n in nodes if n not in reach and n not in ai_sources]
check(
    not orphans, "every non-AI-subnode is reachable from a trigger", ", ".join(orphans)
)

print("\nRESULT:", "FAIL" if failed else "all checks passed")
sys.exit(1 if failed else 0)
