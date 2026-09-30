import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.compiler import (
    DummyCredentialResolver,
    SuppliedParamProvider,
    build_param_form,
    compile,
)
from app.compiler.models import Step


def _gmail_slice_steps():
    return [
        # Step 0 is the synthetic trigger step (see loader.py); it carries the
        # server-side n8n_trigger_node from workflow_generator._enrich_trigger.
        Step(
            step=0,
            service="gmail",
            is_trigger=True,
            n8n_resolution_kind="action_node",  # what loader.py stamps when the trigger resolved
            n8n_trigger_node={"type": "n8n-nodes-base.gmailTrigger", "typeVersion": 1},
        ),
        # Real steps start at 1. `operation` is the canonical verb Groq emits,
        # `target` the resolved n8n resource, and n8n_resolution_kind /
        # n8n_operation are what _enrich_with_real_operations stamps on.
        Step(
            step=1,
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


def test_param_form_lists_gmail_send_fields_only():
    """
    The trigger has nothing to ask for; the Send step needs exactly the
    fields n8n's own UI flagged as missing during the manual import test.
    """
    result = build_param_form(_gmail_slice_steps())
    assert result.is_ready
    assert len(result.forms) == 1  # trigger contributes no form

    form = result.forms[0]
    assert form.step == 1
    assert form.service == "gmail"
    field_names = {f.name for f in form.fields}
    assert field_names == {"sendTo", "subject", "emailType", "message"}


def test_compile_blocks_when_required_params_missing():
    steps = _gmail_slice_steps()
    supplied = {}  # user submitted nothing

    result = compile(
        steps,
        SuppliedParamProvider(supplied),
        DummyCredentialResolver(),
        user_id="test-user",
    )

    assert not result.report.is_deployable
    assert result.workflow_json is None
    unresolved = result.report.needs_user_input[0]
    assert unresolved.step == 1
    assert "sendTo" in unresolved.reason
    assert "subject" in unresolved.reason
    assert "message" in unresolved.reason
    # emailType has a real default ("html") so it should NOT be reported
    # as missing even though it's required -- matches n8n's own UI, which
    # didn't flag it either.
    assert "emailType" not in unresolved.reason


def test_compile_succeeds_with_real_supplied_params():
    steps = _gmail_slice_steps()
    supplied = {
        1: {
            "sendTo": "someone@example.com",
            "subject": "Hello from OmniAgent",
            "message": "This is a real message body.",
        }
    }

    result = compile(
        steps,
        SuppliedParamProvider(supplied),
        DummyCredentialResolver(),
        user_id="test-user",
        workflow_name="Gmail Auto-Reply",
    )

    assert result.report.is_deployable, result.report.needs_user_input
    wf = result.workflow_json
    send_node = next(n for n in wf["nodes"] if n["type"] == "n8n-nodes-base.gmail")

    assert send_node["parameters"]["sendTo"] == "someone@example.com"
    assert send_node["parameters"]["subject"] == "Hello from OmniAgent"
    assert send_node["parameters"]["message"] == "This is a real message body."
    # emailType wasn't supplied but has a real default -> filled from that.
    assert send_node["parameters"]["emailType"] == "html"
    assert send_node["parameters"]["resource"] == "message"
    assert send_node["parameters"]["operation"] == "send"


if __name__ == "__main__":
    test_param_form_lists_gmail_send_fields_only()
    test_compile_blocks_when_required_params_missing()
    test_compile_succeeds_with_real_supplied_params()
    print("All tests passed.")
