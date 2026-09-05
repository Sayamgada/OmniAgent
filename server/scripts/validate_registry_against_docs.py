"""
validate_registry_against_docs.py

Cross-checks every "action_node" entry in n8n_operation_registry.json against
n8n's official docs (docs.n8n.io/integrations/builtin/app-nodes/...), which is
the closest thing n8n has to an authoritative, structured operations list.

WHY THIS EXISTS
----------------------------------------------------------------------------
The registry is built by parsing n8n's TypeScript source across ALL node
versions found in the sparse-checked repo (see node_registry.py's own
docstring: "grep all .ts files ... to catch versioned nodes with credentials
in versionDescription.ts"). That's the right call for credential-type
coverage, but it has a side effect: operations from an OLDER node version can
end up merged into a resource's current operation list with no version
tag, because the extractor doesn't distinguish "this op is on v1 of the node"
from "this op is on the latest version."

Confirmed examples already found by hand:
  - google_drive/file has a "list" operation the CURRENT docs don't show
    anywhere under File (only under a separate File/Folder -> Search).
    Likely leaked from an older node version.
  - gmail has a "messageLabel" resource with a lone "add" operation that
    doesn't exist as its own group in current docs (folded into Message
    there) - needs a human to confirm whether it's a real distinct API
    operation or a source-parsing artifact.
  - gmail also has "Send and Wait for Response" that ISN'T in the docs at
    all - here the registry is actually AHEAD of the docs, not behind.

This script produces a REVIEW LIST, not an auto-fix. Docs text is prose,
not a schema - a mechanical diff will have false positives (grouping
differences, label wording, docs lagging a new feature). Every flagged item
needs a human glance, same as the two examples above.

REQUIREMENTS
----------------------------------------------------------------------------
    pip install requests --break-system-packages   # or your usual env

USAGE
----------------------------------------------------------------------------
    python validate_registry_against_docs.py path/to/n8n_operation_registry.json

Writes registry_doc_diff_report.json and prints a summary to stdout.

HOW URL RESOLUTION WORKS (and its limits)
----------------------------------------------------------------------------
The registry's "node_paths" (e.g. "Google/Drive") do NOT map to n8n's doc
slugs in any single consistent way - confirmed by hand:
    gmail:        node_paths=["Google/Gmail"] -> doc slug "gmail"      (last segment only)
    google_drive: node_paths=["Google/Drive"] -> doc slug "googledrive" (segments joined)
So this script tries several candidate slugs per service, in order, and
takes the first one that returns HTTP 200. Services where every candidate
404s are written to the report's "unresolved" list for manual lookup rather
than guessed at further - see UNRESOLVED_HINT below for how to look those up
by hand (it's one search, not a research project).
"""

import json
import re
import sys
import time
from pathlib import Path

import requests

DOCS_BASE = "https://docs.n8n.io/integrations/builtin/app-nodes"
UNRESOLVED_HINT = (
    "Open https://docs.n8n.io/integrations/builtin/app-nodes and Ctrl+F the "
    "service's display name to find its real slug by hand."
)


def candidate_slugs(node_path: str) -> list[str]:
    """
    Given one node_path like "Google/Drive", return ordered guesses at the
    n8n-nodes-base doc slug. Cheap heuristics only - no ML, no fuzzy search -
    because a wrong guess here just costs one extra HTTP 404, and every
    candidate is verified by an actual request before being trusted.
    """
    segments = [s for s in re.split(r"[/\\]", node_path) if s]
    if not segments:
        return []
    last = segments[-1].lower().replace(" ", "").replace("-", "").replace(".", "")
    joined = "".join(s.lower().replace(" ", "").replace("-", "").replace(".", "") for s in segments)

    out = []
    for prefix in ("n8n-nodes-base", "n8n-nodes-langchain"):
        out.append(f"{prefix}.{last}")
        if joined != last:
            out.append(f"{prefix}.{joined}")
    return out


def fetch_operations_section(slug: str, session: requests.Session) -> tuple[str, dict[str, list[str]]] | None:
    """
    Fetches https://docs.n8n.io/.../app-nodes/<slug>.md and parses the
    "## Operations" section into {resource_label: [operation_label, ...]}.

    Returns None on non-200 (caller tries the next candidate slug).
    Returns (resolved_url, {}) if the page loads but has no Operations
    section at all (some app nodes genuinely don't have one - not an error).
    """
    url = f"{DOCS_BASE}/{slug}.md"
    resp = session.get(url, timeout=15)
    if resp.status_code != 200:
        return None

    text = resp.text
    # Operations section runs from "## Operations" to the next "## " heading.
    match = re.search(r"##\s*Operations.*?\n(.*?)(?=\n##\s|\Z)", text, re.DOTALL)
    if not match:
        return (url, {})

    body = match.group(1)
    resources: dict[str, list[str]] = {}
    current_resource = None
    NO_RESOURCE_KEY = "(no resource)"
    for line in body.splitlines():
        stripped = line.strip()

        # A resource-group header is BOLD TEXT WITH NO LINK on its own bullet,
        # e.g. "*   **File**". An operation is a MARKDOWN LINK, e.g.
        # "*   [**Download**](...) a file". That link-vs-no-link distinction
        # is the reliable signal - NOT nesting depth, because most
        # single-resource nodes (Postgres, Stripe, Airtable, ...) render
        # their operations as a flat list with no resource wrapper at all.
        # Requiring a resource to already be set (the old logic) silently
        # captured zero operations on every one of those pages.
        res_match = re.match(r"^\*\s+\*\*([^*]+)\*\*\s*$", stripped)
        if res_match:
            current_resource = res_match.group(1).strip()
            resources.setdefault(current_resource, [])
            continue

        op_match = re.match(r"^\*\s+\[\*\*([^*]+)\*\*\]", stripped)
        if op_match:
            key = current_resource or NO_RESOURCE_KEY
            resources.setdefault(key, []).append(op_match.group(1).strip())

    return (url, resources)


def registry_operations(entry: dict) -> dict[str, list[str]]:
    """{resource_label: [operation_label, ...]} from the registry's own shape,
    using the human-readable label (not the raw value) so it's comparable to
    docs prose."""
    resources = entry.get("resources", {})
    by_resource = entry.get("operationsByResource", {})
    out = {}
    for res_key, res_label in resources.items():
        ops = by_resource.get(res_key, [])
        out[res_label] = [op.get("label", op.get("value", "")) for op in ops]
    # Flat (no-resource) services
    if not resources:
        flat = entry.get("operationsNoResource", [])
        if flat:
            out["(no resource)"] = [op.get("label", op.get("value", "")) for op in flat]
    return out


def normalize(label: str) -> str:
    """Loose normalization so 'Get Many' vs 'getAll' vs 'Get many' don't
    register as false-positive mismatches."""
    return re.sub(r"[^a-z0-9]", "", label.lower())


def diff_service(service: str, registry_ops: dict[str, list[str]], doc_ops: dict[str, list[str]]) -> dict:
    """
    Compares on NORMALIZED operation labels only, ignoring resource grouping -
    docs and the registry group resources differently often enough (see the
    gmail messageLabel case) that comparing group-by-group produces noise.
    Comparing the flat set of operation labels per service is the more
    reliable signal for "does this operation exist in current n8n or not."
    """
    registry_flat = {normalize(op) for ops in registry_ops.values() for op in ops if op}
    doc_flat = {normalize(op) for ops in doc_ops.values() for op in ops if op}

    only_in_registry = sorted(registry_flat - doc_flat)
    only_in_docs = sorted(doc_flat - registry_flat)

    return {
        "service": service,
        "registry_op_count": len(registry_flat),
        "doc_op_count": len(doc_flat),
        "only_in_registry_normalized": only_in_registry,   # possible stale/version-leaked entries
        "only_in_docs_normalized": only_in_docs,           # possible registry gaps, or docs ahead
        "clean_match": not only_in_registry and not only_in_docs,
    }


def main():
    if len(sys.argv) != 2:
        print("Usage: python validate_registry_against_docs.py <path to n8n_operation_registry.json>")
        sys.exit(1)

    registry_path = Path(sys.argv[1])
    registry = json.loads(registry_path.read_text(encoding="utf-8"))

    action_nodes = {k: v for k, v in registry.items() if v.get("kind") == "action_node"}
    print(f"{len(action_nodes)} action_node services to check.\n")

    session = requests.Session()
    session.headers["User-Agent"] = "OmniAgent-registry-validator/1.0"

    results = []
    unresolved = []

    for i, (service, entry) in enumerate(sorted(action_nodes.items()), start=1):
        node_paths = entry.get("node_paths", [])
        resolved = None
        tried = []
        for node_path in node_paths:
            for slug in candidate_slugs(node_path):
                if slug in tried:
                    continue
                tried.append(slug)
                fetched = fetch_operations_section(slug, session)
                time.sleep(0.3)  # be polite to docs.n8n.io
                if fetched is not None:
                    resolved = fetched
                    break
            if resolved:
                break

        if resolved is None:
            unresolved.append({"service": service, "node_paths": node_paths, "tried_slugs": tried})
            print(f"[{i}/{len(action_nodes)}] {service}: UNRESOLVED (tried {len(tried)} slugs)")
            continue

        url, doc_ops = resolved
        reg_ops = registry_operations(entry)
        diff = diff_service(service, reg_ops, doc_ops)
        diff["doc_url"] = url
        results.append(diff)

        flag = "OK" if diff["clean_match"] else "REVIEW"
        print(f"[{i}/{len(action_nodes)}] {service}: {flag} "
              f"(+{len(diff['only_in_registry_normalized'])} registry-only, "
              f"+{len(diff['only_in_docs_normalized'])} docs-only)")

    report = {
        "checked": len(results),
        "unresolved": unresolved,
        "clean_matches": [r["service"] for r in results if r["clean_match"]],
        "needs_review": [r for r in results if not r["clean_match"]],
    }

    out_path = registry_path.parent / "registry_doc_diff_report.json"
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"\n--- Summary ---")
    print(f"Checked:       {len(results)}")
    print(f"Clean match:   {len(report['clean_matches'])}")
    print(f"Needs review:  {len(report['needs_review'])}")
    print(f"Unresolved:    {len(unresolved)}  ({UNRESOLVED_HINT})")
    print(f"Full report written to {out_path}")


if __name__ == "__main__":
    main()