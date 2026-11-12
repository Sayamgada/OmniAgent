"""
tests/test_ai_selection.py

apply_ai_selection() (Task B, decision D7): rewrites the placeholder AI step
into the provider/model the user picked. Runs against the real registry and
the real AI provider catalog; no nodes.json needed.
"""

import copy

import pytest

from app.core import ai_providers as ap
from app.core.n8n_operation_registry import get_chat_model_node
from app.services.ai_selection import (
    AI_PLACEHOLDER_SERVICE,
    AISelectionError,
    apply_ai_selection,
    default_selection,
    is_ai_step,
)

D4_KEYS = ("groq", "openai", "anthropic", "gemini", "mistral", "openrouter")


def _ai_step(n=2, depends_on=(1,)):
    return {
        "step": n,
        "service": AI_PLACEHOLDER_SERVICE,
        "operation": "generate",
        "target": "",
        "parameters": {},
        "depends_on": list(depends_on),
        "instructions": "Summarise the email retrieved in step 1 in three lines.",
        "n8n_resolved": False,
        "n8n_operation": None,
        "n8n_resolution_kind": "ai_subnode",
        "n8n_subnode": {
            "root_node_type": "@n8n/n8n-nodes-langchain.agent",
            "connection_type": "ai_languageModel",
            "chat_model_node_type": "@n8n/n8n-nodes-langchain.lmChatGroq",
            "agent_instructions_source": "step.instructions",
        },
    }


@pytest.fixture
def workflow():
    return {
        "schema_version": 10,
        "automation_name": "Email summary",
        "automation_description": "Summarise new emails and send the summary.",
        "required_integrations": [
            {"service": "gmail", "display_name": "Gmail", "required": True},
            {
                "service": AI_PLACEHOLDER_SERVICE,
                "display_name": "AI Provider (Groq)",
                "required": True,
            },
        ],
        "preview_json": {
            "title": "Email summary",
            "trigger": {"type": "Email", "service": "gmail", "description": ""},
            "workflow": [
                {
                    "step": 1,
                    "service": "gmail",
                    "operation": "list",
                    "target": "message",
                    "parameters": {},
                    "depends_on": [],
                    "n8n_resolution_kind": "action_node",
                },
                _ai_step(),
                {
                    "step": 3,
                    "service": "gmail",
                    "operation": "send",
                    "target": "message",
                    "parameters": {},
                    "depends_on": [2],
                    "n8n_resolution_kind": "action_node",
                },
            ],
        },
    }


def _services(wf):
    return [r["service"] for r in wf["required_integrations"]]


def _ai_steps(wf):
    return [s for s in wf["preview_json"]["workflow"] if is_ai_step(s)]


@pytest.mark.parametrize("key", D4_KEYS)
def test_rewrites_ai_step_to_selected_provider(workflow, key):
    out = apply_ai_selection(workflow, key)
    node = get_chat_model_node(key)
    default = ap.get_ai_provider(key).default_model
    (step,) = _ai_steps(out)
    assert step["service"] == key
    sub = step["n8n_subnode"]
    assert sub["chat_model_node_type"] == node["type"]
    assert sub["chat_model_type_version"] == node["typeVersion"]
    assert sub["model_parameters"] == ap.model_parameters(key, default)
    # the agent root and everything else in the block is untouched
    assert sub["root_node_type"] == "@n8n/n8n-nodes-langchain.agent"
    assert out["ai_selection"] == {"provider": key, "model": default}


@pytest.mark.parametrize("key", D4_KEYS)
def test_required_integrations_list_the_provider_once(workflow, key):
    out = apply_ai_selection(workflow, key)
    services = _services(out)
    assert services.count(key) == 1
    assert "gmail" in services
    if key != AI_PLACEHOLDER_SERVICE:
        assert AI_PLACEHOLDER_SERVICE not in services
    entry = next(r for r in out["required_integrations"] if r["service"] == key)
    assert entry["required"] is True
    assert ap.get_ai_provider(key).display_name in entry["display_name"]


def test_non_ai_steps_are_untouched(workflow):
    out = apply_ai_selection(workflow, "openai")
    before = [s for s in workflow["preview_json"]["workflow"] if not is_ai_step(s)]
    after = [s for s in out["preview_json"]["workflow"] if not is_ai_step(s)]
    assert before == after


def test_input_is_not_modified(workflow):
    snapshot = copy.deepcopy(workflow)
    apply_ai_selection(workflow, "anthropic", "claude-sonnet-5")
    assert workflow == snapshot


def test_idempotent(workflow):
    once = apply_ai_selection(workflow, "mistral")
    twice = apply_ai_selection(once, "mistral")
    assert once == twice


def test_switching_provider_replaces_the_previous_one(workflow):
    first = apply_ai_selection(workflow, "openai")
    second = apply_ai_selection(first, "mistral")
    assert "openai" not in _services(second)
    assert _services(second).count("mistral") == 1
    assert _ai_steps(second)[0]["service"] == "mistral"


def test_provider_used_by_a_non_ai_step_keeps_its_entry(workflow):
    # e.g. an openai image-generation step: a hub action, not the AI step (D9)
    workflow["preview_json"]["workflow"].append(
        {
            "step": 4,
            "service": "openai",
            "operation": "generate",
            "target": "image",
            "parameters": {},
            "depends_on": [],
            "n8n_resolution_kind": "unsupported_kind",
        }
    )
    workflow["required_integrations"].append(
        {"service": "openai", "display_name": "OpenAI", "required": True}
    )
    first = apply_ai_selection(workflow, "openai")
    assert _services(first).count("openai") == 1
    second = apply_ai_selection(first, "gemini")
    assert "openai" in _services(second)  # still needed by step 4
    assert "gemini" in _services(second)
    image_step = second["preview_json"]["workflow"][-1]
    assert image_step["service"] == "openai"
    assert "n8n_subnode" not in image_step


def test_adds_provider_when_generator_forgot_it(workflow):
    workflow["required_integrations"] = [
        r for r in workflow["required_integrations"] if r["service"] == "gmail"
    ]
    out = apply_ai_selection(workflow, "gemini")
    assert "gemini" in _services(out)


def test_workflow_without_ai_step_is_unchanged(workflow):
    workflow["preview_json"]["workflow"] = [
        s for s in workflow["preview_json"]["workflow"] if not is_ai_step(s)
    ]
    workflow["required_integrations"] = workflow["required_integrations"][:1]
    out = apply_ai_selection(workflow, "openai")
    assert out == workflow


def test_blank_model_means_default_and_custom_model_is_kept(workflow):
    blank = apply_ai_selection(workflow, "groq", "   ")
    assert blank["ai_selection"]["model"] == ap.get_ai_provider("groq").default_model
    custom = apply_ai_selection(workflow, "groq", "my-org/custom-model")
    sub = _ai_steps(custom)[0]["n8n_subnode"]
    assert sub["model_parameters"] == {"model": "my-org/custom-model"}


def test_gemini_model_gets_prefix_once(workflow):
    out = apply_ai_selection(workflow, "gemini", "gemini-2.5-flash")
    sub = _ai_steps(out)[0]["n8n_subnode"]
    assert sub["model_parameters"] == {"modelName": "models/gemini-2.5-flash"}
    out2 = apply_ai_selection(workflow, "gemini", "models/gemini-2.5-flash")
    assert _ai_steps(out2)[0]["n8n_subnode"]["model_parameters"] == {
        "modelName": "models/gemini-2.5-flash"
    }


def test_resource_locator_providers_get_rl_value(workflow):
    out = apply_ai_selection(workflow, "openai", "gpt-5-mini")
    sub = _ai_steps(out)[0]["n8n_subnode"]
    assert sub["model_parameters"] == {
        "model": {"__rl": True, "mode": "id", "value": "gpt-5-mini"}
    }


@pytest.mark.parametrize("bad", ["cohere", "", None])
def test_unknown_provider_raises(workflow, bad):
    with pytest.raises(AISelectionError):
        apply_ai_selection(workflow, bad)


def test_default_selection_is_groq_default():
    assert default_selection() == ("groq", ap.get_ai_provider("groq").default_model)
