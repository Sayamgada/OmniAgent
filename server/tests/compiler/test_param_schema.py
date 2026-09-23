import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.compiler.param_schema import get_required_params


def test_gmail_send_required_fields():
    fields = get_required_params("n8n-nodes-base.gmail", 2.2, "message", "send")
    names = {f.name for f in fields}
    assert names == {"sendTo", "subject", "emailType", "message"}

    by_name = {f.name: f for f in fields}
    assert by_name["sendTo"].type == "string"
    assert by_name["subject"].type == "string"
    assert by_name["message"].type == "string"
    # emailType is required but has a real default ("html") -- n8n doesn't
    # actually block the user on it, unlike sendTo/subject/message which
    # default to "".
    assert by_name["emailType"].default == "html"


def test_gmail_get_message_differs_from_send():
    fields = get_required_params("n8n-nodes-base.gmail", 2.2, "message", "get")
    names = {f.name for f in fields}
    assert names == {"messageId"}


def test_gmail_trigger_has_no_resource_operation_fields():
    fields = get_required_params("n8n-nodes-base.gmailTrigger", 1, None, None)
    assert fields == []


def test_unknown_node_type_returns_empty_not_error():
    fields = get_required_params("n8n-nodes-base.totally-made-up", 1, "x", "y")
    assert fields == []


if __name__ == "__main__":
    test_gmail_send_required_fields()
    test_gmail_get_message_differs_from_send()
    test_gmail_trigger_has_no_resource_operation_fields()
    test_unknown_node_type_returns_empty_not_error()
    print("All tests passed.")
