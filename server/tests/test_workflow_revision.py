import asyncio

import pytest

from app.services.workflow_revision import (
    base_automation_name,
    render_edit_section,
    unique_revision_name,
)


def _run(coro):
    return asyncio.run(coro)


def test_base_name_strips_only_a_trailing_revision_suffix():
    assert base_automation_name("Morning Gmail Summary to Slack (edit a1b2)") == (
        "Morning Gmail Summary to Slack"
    )
    assert base_automation_name("Morning Gmail Summary to Slack") == (
        "Morning Gmail Summary to Slack"
    )
    # a parenthetical that is not our suffix is left alone
    assert base_automation_name("Report (edit mode)") == "Report (edit mode)"


def test_revision_name_appends_suffix_and_never_reuses_the_original():
    async def never_taken(_name):
        return False

    name = _run(unique_revision_name("Morning Gmail Summary", never_taken))
    assert name.startswith("Morning Gmail Summary (edit ")
    assert name != "Morning Gmail Summary"


def test_revision_of_a_revision_does_not_stack_suffixes():
    async def never_taken(_name):
        return False

    name = _run(unique_revision_name("X (edit a1b2)", never_taken))
    assert name.count("(edit ") == 1
    assert name.startswith("X (edit ")


def test_revision_name_retries_on_collision():
    taken = {"X (edit aaaa)", "X (edit bbbb)"}
    tokens = iter(["aaaa", "bbbb", "cccc"])

    async def is_taken(name):
        return name in taken

    name = _run(unique_revision_name("X", is_taken, token_fn=lambda: next(tokens)))
    assert name == "X (edit cccc)"


def test_revision_name_gives_up_instead_of_looping_forever():
    async def always_taken(_name):
        return True

    with pytest.raises(RuntimeError):
        _run(unique_revision_name("X", always_taken, max_tries=3))


def test_edit_section_carries_the_previous_preview_and_nothing_else():
    previous = {
        "_id": "mongo-object-id",
        "created_at": "2026-10-22",
        "automation_name": "Morning Gmail Summary to Slack",
        "automation_description": "Summarises unread Gmail each morning.",
        "required_integrations": [{"service": "gmail", "required": True}],
        "preview_json": {"workflow": [{"step": 1, "service": "gmail"}]},
    }
    text = render_edit_section(previous)
    assert "Revision Mode" in text
    assert "Morning Gmail Summary to Slack" in text
    assert '"service": "gmail"' in text
    assert "mongo-object-id" not in text
    assert "created_at" not in text
