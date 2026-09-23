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
    (app/utils/generated_registry.json). resource="message" is a manual
    hint for step 2 (see loader.py's docstring -- resource inference from
    Groq's free text isn't decided yet); step 1 is the trigger and needs
    neither resource nor operation.
    """
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

    # operation resolution via the real resolve_operation()+universal_verb
    # bridge: "Send a message" -> verb "send" -> op value "send".
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
    # "Handle the message somehow" doesn't map to a single universal_verb
    # via the VERB_KEYWORDS bridge -> genuinely unresolvable, must be
    # flagged, never silently guessed.
    steps[1].action = "Handle the message somehow"

    result = compile(
        steps,
        PlaceholderParamProvider(),
        DummyCredentialResolver(),
        user_id="test-user",
    )

    assert not result.report.is_deployable
    assert result.workflow_json is None
    unresolved = result.report.needs_user_input[0]
    assert unresolved.step == 2
    assert unresolved.service == "gmail"
    values = {c["value"] for c in unresolved.candidates}
    assert "send" in values and "get" in values and "getAll" in values


if __name__ == "__main__":
    test_gmail_slice_compiles_and_is_deployable()
    test_ambiguous_operation_is_flagged_not_guessed()
    print("All tests passed.")
