import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.compiler import (
    PlaceholderParamProvider,
    DummyCredentialResolver,
    compile,
)
from app.compiler.models import Step


def build_gmail_slice_steps():
    """
    Gmail Trigger -> Gmail Send, against the REAL generated_registry.json
    (app/utils/generated_registry.json). Built the way loader.py builds
    real previews: trigger = synthetic step 0, real steps from 1, and the
    server-side enrichment fields (n8n_resolution_kind / n8n_operation /
    n8n_trigger_node) already stamped on.
    """
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


def test_gmail_slice_compiles_and_is_deployable():
    steps = build_gmail_slice_steps()
    result = compile(
        steps,
        PlaceholderParamProvider(),
        DummyCredentialResolver(),
        user_id="test-user",
        workflow_name="Gmail Auto-Reply",
    )

    assert result.report.is_deployable, result.report.needs_user_input
    assert result.workflow_json is not None

    wf = result.workflow_json
    assert len(wf["nodes"]) == 2

    trigger_node = next(
        n for n in wf["nodes"] if n["type"] == "n8n-nodes-base.gmailTrigger"
    )
    send_node = next(n for n in wf["nodes"] if n["type"] == "n8n-nodes-base.gmail")

    assert isinstance(trigger_node["typeVersion"], (int, float))
    assert isinstance(send_node["typeVersion"], (int, float))

    # No per-operation param schema exists in the registry -- trigger gets
    # no parameters at all (correctly, this time -- not the Send action's).
    assert trigger_node["parameters"] == {}

    # operation comes from the server-resolved n8n_operation
    # ({"value": "send"}) -- no verb-guessing bridge any more.
    assert send_node["parameters"]["operation"] == "send"
    assert send_node["parameters"]["resource"] == "message"

    # credentials: gmail's default_option is google_service_account_api ->
    # n8n_credential_type "googleApi" (confirmed from the real registry,
    # NOT the gmailOAuth2 "primary" option -- default_option wins).
    assert trigger_node["credentials"]["googleApi"]["id"] == "DUMMY_CRED_ID"
    assert send_node["credentials"]["googleApi"]["id"] == "DUMMY_CRED_ID"

    conns = wf["connections"]
    assert trigger_node["name"] in conns
    target = conns[trigger_node["name"]]["main"][0][0]
    assert target["node"] == send_node["name"]

    ids = [n["id"] for n in wf["nodes"]]
    assert len(ids) == len(set(ids))


def test_ambiguous_operation_is_flagged_not_guessed():
    steps = build_gmail_slice_steps()
    # Gmail "read" on a message is a genuine Get-vs-Get-Many ambiguity: the
    # server marks it no_operation_match with n8n_operation=None, and the
    # compiler must flag it, never silently guess.
    steps[1].operation = "read"
    steps[1].n8n_resolution_kind = "no_operation_match"
    steps[1].n8n_operation = None

    result = compile(
        steps,
        PlaceholderParamProvider(),
        DummyCredentialResolver(),
        user_id="test-user",
    )

    assert not result.report.is_deployable
    assert result.workflow_json is None
    unresolved = result.report.needs_user_input[0]
    assert unresolved.step == 1
    assert unresolved.service == "gmail"
    values = {c["value"] for c in unresolved.candidates}
    assert {"get", "getAll"} <= values


if __name__ == "__main__":
    test_gmail_slice_compiles_and_is_deployable()
    test_ambiguous_operation_is_flagged_not_guessed()
    print("All tests passed.")
