"""
scripts/print_gmail_full_params.py

Same idea as print_workflow.py, but hardcodes real (test) values for
Gmail Send's required parameters via SuppliedParamProvider, instead of
either the placeholder filler or an empty dict. This is what proves the
full param_schema.py -> SuppliedParamProvider -> compile() loop produces
a workflow n8n will actually accept AND execute, not just import cleanly.

Run from server/ (same place tests/compiler/ runs from):
    python scripts/print_gmail_full_params.py

Edit SUPPLIED_PARAMS below before running if you want to test with a
real email address you control, rather than the placeholder one here.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.compiler import SuppliedParamProvider, CredentialResolver, compile
from app.compiler.models import Step

# Edit this before running to test with a real inbox you control.
SUPPLIED_PARAMS = {
    2: {
        "sendTo": "test@example.com",
        "subject": "Test from OmniAgent compiler",
        "message": "This workflow was compiled end-to-end.",
    }
}


class NoCredentialResolver(CredentialResolver):
    """Omits the credentials block -- attach your real Gmail credential
    manually in the n8n UI after importing, same as the earlier test."""

    def resolve(self, user_id: str, n8n_credential_type: str):
        return None


def main():
    steps = [
        Step(step=1, service="gmail", action="Watch for new email", is_trigger=True),
        Step(
            step=2,
            service="gmail",
            action="Send a message",
            resource="message",
            depends_on=[1],
        ),
    ]

    result = compile(
        steps,
        SuppliedParamProvider(SUPPLIED_PARAMS),
        NoCredentialResolver(),
        user_id="cli-user",
        workflow_name="Gmail Auto-Reply (full params)",
    )

    if not result.report.is_deployable:
        print("NOT DEPLOYABLE:", file=sys.stderr)
        for u in result.report.needs_user_input:
            print(f"  step {u.step} ({u.service}): {u.reason}", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(result.workflow_json, indent=2))


if __name__ == "__main__":
    main()
