"""
extract-workflow edit loop: a prompt that revises an existing workflow must
NOT be answered from the FAISS/Mongo cache (a small edit scores >= the 0.75
threshold against the workflow it revises and would come back unchanged).
"""

import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.routers import agent_router as r

PREVIOUS = {
    "_id": "oid",
    "automation_name": "Morning Gmail Summary to Slack",
    "automation_description": "Summarises unread Gmail and posts it to Slack.",
    "required_integrations": [
        {"service": "gmail", "display_name": "Gmail", "required": True}
    ],
    "preview_json": {"title": "t", "workflow": [{"step": 1, "service": "gmail"}]},
}


def _body(**kw):
    data = {
        "domain": "Corporate",
        "description": "Every morning, summarize my Gmail",
        "top_k": 5,
    }
    data.update(kw)
    return r.WorkflowRequest(**data)


def _call(body):
    return asyncio.run(
        r.extract_workflow(body, db=None, current_user=SimpleNamespace(id="u1"))
    )


@pytest.fixture
def wired(monkeypatch):
    calls = SimpleNamespace(search=[], generate=[], store_mongo=[], store_full=[])

    def search(**kw):
        calls.search.append(kw)
        return [
            {
                "automation_name": PREVIOUS["automation_name"],
                "description": PREVIOUS["automation_description"],
                "similarity_score": 0.95,
            }
        ]

    async def get_by_name(name):
        return PREVIOUS if name == PREVIOUS["automation_name"] else None

    async def generate(**kw):
        calls.generate.append(kw)
        return {
            "automation_name": "Whatever Groq Called It",
            "automation_description": "revised",
            "required_integrations": [],
            "preview_json": {"workflow": []},
        }

    async def store_mongo(w):
        calls.store_mongo.append(dict(w))

    async def store_full(w, domain):
        calls.store_full.append((dict(w), domain))

    async def fetch_cached(**kw):
        return {
            "automation_name": kw["automation_name"],
            "automation_description": kw["automation_description"],
            "required_integrations": [],
            "preview_json": {"workflow": []},
            "schema_version": r.CURRENT_SCHEMA_VERSION,
        }

    monkeypatch.setattr(r, "search_automations", search)
    monkeypatch.setattr(
        r, "AutomationPreviewService", SimpleNamespace(get_by_name=get_by_name)
    )
    monkeypatch.setattr(r, "generate_groq_workflow", generate)
    monkeypatch.setattr(r, "store_generated_workflow_mongo", store_mongo)
    monkeypatch.setattr(r, "store_generated_workflow", store_full)
    monkeypatch.setattr(r, "fetch_mongo_workflow", fetch_cached)
    monkeypatch.setattr(r, "check_required_integrations", lambda **kw: [])
    return calls


def test_edit_of_bypasses_the_cache_and_revises_the_previous_preview(wired):
    resp = _call(_body(edit_of=PREVIOUS["automation_name"]))

    assert wired.search == []  # no FAISS lookup at all
    assert len(wired.generate) == 1
    assert wired.generate[0]["edit_base"] == PREVIOUS
    assert wired.generate[0]["context"] == ""
    assert wired.store_full == []  # not re-indexed into FAISS
    assert len(wired.store_mongo) == 1  # Mongo only

    name = resp.workflow["automation_name"]
    assert name != PREVIOUS["automation_name"]
    assert name.startswith(PREVIOUS["automation_name"] + " (edit ")


def test_edit_of_unknown_name_is_a_404_not_a_silent_fresh_generation(wired):
    with pytest.raises(HTTPException) as exc:
        _call(_body(edit_of="No Such Automation"))
    assert exc.value.status_code == 404
    assert wired.generate == []


def test_without_edit_of_a_cache_hit_is_still_served_from_mongo(wired):
    resp = _call(_body())

    assert len(wired.search) == 1
    assert wired.generate == []  # Groq NOT called: existing behaviour unchanged
    assert resp.workflow["automation_name"] == PREVIOUS["automation_name"]


def test_blank_edit_of_is_rejected_by_the_request_model():
    with pytest.raises(ValidationError):
        _body(edit_of="")
