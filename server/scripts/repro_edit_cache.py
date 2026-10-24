"""
Read-only repro for the edit-loop hypothesis: a slightly edited prompt still
scores >= the cache threshold, resolves to the SAME automation, and so
/agents/extract-workflow serves the old cached workflow instead of generating
a new one.

It calls the exact function the router calls (search_automations, with the same
category filter and top_k), prints nothing to Mongo/FAISS and writes nothing.

Usage (from D:\\Projects\\OmniAgent\\server):
    python scripts/repro_edit_cache.py --domain Corporate ^
        --original "<exact description the first request sent>" ^
        --edited   "<exact description after the edit>"

Copy the two descriptions from the browser devtools Network tab
(extract-workflow -> Payload -> description), so any text the wizard adds
(e.g. the "Agent Name: ..." line) is included exactly as the server saw it.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.vectorstore import search_automations  # noqa: E402

DEFAULT_THRESHOLD = 0.75  # keep in sync with agent_router.SIMILARITY_THRESHOLD


def probe(label: str, text: str, domain: str, top_k: int, threshold: float):
    docs = search_automations(query=text, category=domain, top_k=top_k)
    print(f"\n=== {label} ===")
    if not docs:
        print("no candidates -> router would GENERATE (and index in FAISS)")
        return None
    for d in sorted(docs, key=lambda d: d["similarity_score"], reverse=True):
        print(f"  {d['similarity_score']:.2f}  {d['automation_name']}")
    best = max(docs, key=lambda d: d["similarity_score"])
    hit = best["similarity_score"] >= threshold
    print(
        f"best = {best['similarity_score']:.2f} vs threshold {threshold:.2f} -> "
        + (
            "CACHE HIT (Mongo lookup, Groq NOT called)"
            if hit
            else "MISS (Groq generates)"
        )
    )
    return best["automation_name"] if hit else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--domain", required=True, choices=["Corporate", "Education", "Finance"]
    )
    ap.add_argument("--original", required=True)
    ap.add_argument("--edited", required=True)
    ap.add_argument("--top-k", type=int, default=5)
    ap.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    a = ap.parse_args()

    first = probe("ORIGINAL", a.original, a.domain, a.top_k, a.threshold)
    second = probe("EDITED", a.edited, a.domain, a.top_k, a.threshold)

    print("\n=== VERDICT ===")
    if first and second and first == second:
        print(
            f"CONFIRMED: both prompts hit '{first}'. The edit is swallowed; "
            "the cached workflow is served unchanged."
        )
    elif second and not first:
        print(
            f"Edited prompt hits '{second}' but the original did not: "
            "the edit switched to a cached workflow."
        )
    elif second and first and first != second:
        print(
            f"Different cached workflows ('{first}' vs '{second}'): "
            "the edit is not swallowed for this pair."
        )
    else:
        print(
            "Edited prompt misses the cache: Groq would generate a fresh "
            "workflow, so this pair does not reproduce the bug."
        )


if __name__ == "__main__":
    main()
