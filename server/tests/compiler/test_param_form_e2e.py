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
        Step(step=1, service="gmail", action="Watch for new email", is_trigger=True),
        Step(
            step=2,
            service="gmail",
            action="Send a message",
            resource="message",
            depends_on=[1],
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
    assert form.step == 2
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
    assert unresolved.step == 2
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
        2: {
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
