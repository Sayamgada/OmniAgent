"""
tests/test_get_chat_model_node.py

get_chat_model_node(): the registry accessor that resolves an AI provider
service key to its chat-model node. Real-registry tests read the live
generated_registry.json; the ambiguity cases use a patched registry so they
don't depend on what n8n happens to ship.
"""

import pytest

from app.core import n8n_operation_registry as reg

D4_PROVIDERS = ("groq", "openai", "anthropic", "gemini", "mistral", "openrouter")


@pytest.mark.parametrize("service", D4_PROVIDERS)
def test_every_d4_provider_resolves_to_a_chat_model_node(service):
    node = reg.get_chat_model_node(service)
    assert node is not None, f"{service} has no resolvable chat-model node"
    assert ".lmChat" in node["type"]
    assert node["typeVersion"] is not None


def test_standalone_providers_have_no_family():
    for service in ("groq", "openrouter"):
        assert reg.get_chat_model_node(service)["family"] is None


def test_hub_providers_report_their_family():
    assert reg.get_chat_model_node("openai")["family"] == "lmChatOpenAi"
    assert reg.get_chat_model_node("anthropic")["family"] == "lmChatAnthropic"
    assert reg.get_chat_model_node("gemini")["family"] == "lmChatGoogleGemini"
    assert reg.get_chat_model_node("mistral")["family"] == "lmChatMistralCloud"


def test_non_ai_service_returns_none():
    assert reg.get_chat_model_node("gmail") is None


def test_unknown_service_returns_none():
    assert reg.get_chat_model_node("definitely_not_a_service") is None
    assert reg.get_chat_model_node("_utility_nodes") is None


def _patched(monkeypatch, registry):
    monkeypatch.setattr(reg, "_load_registry", lambda: registry)


def test_hub_with_two_chat_families_is_ambiguous(monkeypatch):
    _patched(
        monkeypatch,
        {
            "x": {
                "kind": "multi_node_hub",
                "nodes": {
                    "families": {
                        "lmChatA": {"type": "pkg.lmChatA", "typeVersion": 1},
                        "lmChatB": {"type": "pkg.lmChatB", "typeVersion": 1},
                    }
                },
            }
        },
    )
    assert reg.get_chat_model_node("x") is None


def test_hub_with_no_chat_family_returns_none(monkeypatch):
    _patched(
        monkeypatch,
        {
            "x": {
                "kind": "multi_node_hub",
                "nodes": {
                    "families": {
                        "lmX": {"type": "pkg.lmX", "typeVersion": 1},
                        "embeddingsX": {"type": "pkg.embeddingsX", "typeVersion": 1},
                    }
                },
            }
        },
    )
    assert reg.get_chat_model_node("x") is None


def test_standalone_that_is_not_a_chat_model_returns_none(monkeypatch):
    _patched(
        monkeypatch,
        {
            "x": {
                "kind": "ai_subnode",
                "nodes": {"standalone": {"type": "pkg.embeddingsX", "typeVersion": 1}},
            }
        },
    )
    assert reg.get_chat_model_node("x") is None


def test_hub_ignores_non_chat_siblings(monkeypatch):
    _patched(
        monkeypatch,
        {
            "x": {
                "kind": "multi_node_hub",
                "nodes": {
                    "families": {
                        "lmChatX": {"type": "pkg.lmChatX", "typeVersion": 2},
                        "embeddingsX": {"type": "pkg.embeddingsX", "typeVersion": 1},
                        "lmX": {"type": "pkg.lmX", "typeVersion": 1},
                    }
                },
            }
        },
    )
    assert reg.get_chat_model_node("x") == {
        "type": "pkg.lmChatX",
        "typeVersion": 2,
        "family": "lmChatX",
    }
