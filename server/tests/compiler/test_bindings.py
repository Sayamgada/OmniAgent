from app.compiler.bindings import (
    GMAIL_TRIGGER_TYPE,
    compute_bindings,
    node_ref,
)
from app.compiler.models import ConditionBranch, ResolvedNode, Step

FIELDS = ["sendTo", "subject", "emailType", "message"]


def _graph(router: bool):
    steps = {
        0: Step(step=0, service="gmail", is_trigger=True),
        2: Step(
            step=2,
            service="groq",
            depends_on=[0],
            condition=(
                [ConditionBranch("approved", ""), ConditionBranch("rejected", "")]
                if router
                else None
            ),
        ),
        3: Step(
            step=3, service="gmail", operation="send", depends_on=[2], branch="approved"
        ),
    }
    resolved = {
        0: ResolvedNode(
            step=0,
            kind="action_node",
            node_type=GMAIL_TRIGGER_TYPE,
            name="Gmail Trigger",
        ),
        2: ResolvedNode(step=2, kind="agent_root", name="AI Agent"),
        3: ResolvedNode(step=3, kind="action_node", name="Gmail"),
    }
    return steps, resolved


def test_reply_fields_bind_to_trigger_email_via_named_reference():
    steps, resolved = _graph(router=True)
    b = compute_bindings(steps[3], steps, resolved, FIELDS)
    assert b["sendTo"][0].expression == "={{ $('Gmail Trigger').first().json.From }}"
    assert b["sendTo"][0].default is True
    assert (
        b["subject"][0].expression
        == "=Re: {{ $('Gmail Trigger').first().json.Subject }}"
    )
    assert "emailType" not in b


def test_router_agent_output_offered_but_not_preapplied():
    steps, resolved = _graph(router=True)
    msg = compute_bindings(steps[3], steps, resolved, FIELDS)["message"][0]
    assert msg.expression == "={{ $('AI Agent').first().json.output }}"
    assert msg.default is False


def test_content_agent_output_is_preapplied():
    steps, resolved = _graph(router=False)
    assert (
        compute_bindings(steps[3], steps, resolved, FIELDS)["message"][0].default
        is True
    )


def test_no_upstream_means_no_bindings_and_trigger_has_none():
    steps, resolved = _graph(router=False)
    assert compute_bindings(steps[0], steps, resolved, FIELDS) == {}


def test_non_gmail_trigger_gets_no_email_bindings():
    steps, resolved = _graph(router=False)
    resolved[0].node_type = "n8n-nodes-base.webhook"
    b = compute_bindings(steps[3], steps, resolved, FIELDS)
    assert "sendTo" not in b and "subject" not in b and "message" in b


def test_node_names_with_quotes_are_escaped():
    assert node_ref("Bob's Node", "x") == "$('Bob\\'s Node').first().json.x"
