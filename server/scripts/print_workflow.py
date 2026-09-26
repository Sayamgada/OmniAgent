"""
scripts/print_workflow.py

Compiles a workflow and prints the resulting n8n workflow JSON to stdout,
so you can eyeball or paste it straight into n8n's "Import from
Clipboard" without writing a pytest assertion each time.

Usage:
    # built-in Gmail Trigger -> Send slice (no file needed)
    python scripts/print_workflow.py

    # compile a real preview.json (the shape your /agents/extract-workflow
    # endpoint returns -- see loader.py's preview_to_steps())
    python scripts/print_workflow.py path/to/preview.json

    # attach real credentials instead of omitting them (pass a JSON blob
    # of {n8n_credential_type: {"id": ..., "name": ...}, ...})
    python scripts/print_workflow.py path/to/preview.json --creds path/to/creds.json

Run this from the server/ directory (same place tests/compiler/ runs
from) so `app.compiler` resolves correctly.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.compiler import PlaceholderParamProvider, CredentialResolver, compile
from app.compiler.loader import preview_to_steps
from app.compiler.models import Step


class NoCredentialResolver(CredentialResolver):
    """Omits the credentials block entirely -- for manual-assign-in-UI imports."""

    def resolve(self, user_id: str, n8n_credential_type: str):
        return None


class StaticCredentialResolver(CredentialResolver):
    """Looks up real credential ids/names from a {n8n_credential_type: {...}} dict."""

    def __init__(self, creds: dict):
        self._creds = creds

    def resolve(self, user_id: str, n8n_credential_type: str):
        return self._creds.get(n8n_credential_type)


def _builtin_gmail_slice() -> list[Step]:
    # Realigned against the real preview_json contract: the trigger is
    # step 0 with n8n_resolution_kind/n8n_trigger_node set directly
    # (mirrors what loader.py builds from preview_json["trigger"]), and
    # step 2 carries operation/target + n8n_operation the way the server's
    # own enrichment would, rather than free-text `action`.
    return [
        Step(
            step=0,
            service="gmail",
            is_trigger=True,
            depends_on=[],
            n8n_resolution_kind="action_node",
            n8n_trigger_node={
                "type": "n8n-nodes-base.gmailTrigger",
                "typeVersion": 1.4,
            },
        ),
        Step(
            step=2,
            service="gmail",
            operation="send",
            target="message",
            depends_on=[0],
            n8n_resolution_kind="action_node",
            n8n_operation={
                "label": "Send",
                "value": "send",
                "action": "Send a message",
            },
        ),
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "preview_path",
        nargs="?",
        default=None,
        help="Path to a preview.json (Groq output contract shape). "
        "Omit to run the built-in Gmail Trigger->Send slice.",
    )
    parser.add_argument(
        "--creds",
        default=None,
        help="Path to a JSON file of {n8n_credential_type: {id, name}}. "
        "Omit to leave every node's credentials block empty.",
    )
    parser.add_argument("--name", default="Generated Workflow", help="Workflow name.")
    args = parser.parse_args()

    if args.preview_path:
        with open(args.preview_path) as f:
            preview = json.load(f)
        # resource_hints is gone -- target already arrives resolved from
        # Groq/server-side enrichment, nothing left to hint.
        steps = preview_to_steps(preview)
    else:
        steps = _builtin_gmail_slice()

    if args.creds:
        with open(args.creds) as f:
            resolver = StaticCredentialResolver(json.load(f))
    else:
        resolver = NoCredentialResolver()

    result = compile(
        steps,
        PlaceholderParamProvider(),
        resolver,
        user_id="cli-user",
        workflow_name=args.name,
    )

    if not result.report.is_deployable:
        print("NOT DEPLOYABLE -- unresolved steps:", file=sys.stderr)
        for u in result.report.needs_user_input:
            print(f"  step {u.step} ({u.service}): {u.reason}", file=sys.stderr)
            for c in u.candidates:
                print(f"    candidate: {c}", file=sys.stderr)
        sys.exit(1)

    for w in result.report.warnings:
        print(f"WARNING: {w}", file=sys.stderr)

    print(json.dumps(result.workflow_json, indent=2))


if __name__ == "__main__":
    main()
