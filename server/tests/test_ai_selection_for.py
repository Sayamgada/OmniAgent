"""
tests/test_ai_selection_for.py

selection_for(): precedence of the request's choice, the user's saved
default and the groq fallback (Task B, Session C).
"""

from types import SimpleNamespace

import pytest

from app.core.ai_providers import get_ai_provider
from app.services.ai_selection import (
    MAX_MODEL_LENGTH,
    AISelectionError,
    selection_for,
)


def _user(provider=None, model=None):
    return SimpleNamespace(default_ai_provider=provider, default_ai_model=model)


def _default(key):
    return get_ai_provider(key).default_model


def test_nothing_anywhere_is_groq_default():
    assert selection_for() == ("groq", _default("groq"))
    assert selection_for(_user()) == ("groq", _default("groq"))


def test_saved_default_used_when_request_is_empty():
    user = _user("mistral", "mistral-large-latest")
    assert selection_for(user) == ("mistral", "mistral-large-latest")
    assert selection_for(user, "  ", "") == ("mistral", "mistral-large-latest")


def test_saved_provider_without_model_uses_provider_default():
    assert selection_for(_user("gemini")) == ("gemini", _default("gemini"))


def test_request_provider_wins_over_saved_default():
    user = _user("mistral", "mistral-large-latest")
    assert selection_for(user, "openai") == ("openai", _default("openai"))
    assert selection_for(user, "openai", "gpt-custom") == ("openai", "gpt-custom")


def test_request_for_saved_provider_without_model_keeps_saved_model():
    user = _user("mistral", "mistral-large-latest")
    assert selection_for(user, "mistral") == ("mistral", "mistral-large-latest")


def test_request_model_alone_applies_to_the_effective_provider():
    assert selection_for(_user("gemini"), None, "gemini-2.5-pro") == (
        "gemini",
        "gemini-2.5-pro",
    )
    assert selection_for(None, None, "qwen/custom") == ("groq", "qwen/custom")


def test_stale_saved_default_is_ignored():
    assert selection_for(_user("cohere", "command-r")) == ("groq", _default("groq"))


def test_unknown_request_provider_raises():
    with pytest.raises(AISelectionError):
        selection_for(_user(), "cohere")


def test_overlong_model_raises():
    with pytest.raises(AISelectionError):
        selection_for(None, "groq", "x" * (MAX_MODEL_LENGTH + 1))


def test_user_object_without_the_columns_is_fine():
    assert selection_for(object()) == ("groq", _default("groq"))
