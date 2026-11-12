"""
app/core/ai_providers.py

Slim catalog of the LLM providers a user can pick for the AI step of a
generated workflow (Task B, decision D4: groq, openai, anthropic, gemini,
mistral, openrouter).

WHAT IS HAND-OWNED HERE, AND WHAT IS NOT
------------------------------------------------------------------------------
Everything about the n8n node itself (type, typeVersion) is read from the
registry via get_chat_model_node() -- never hardcoded, so it follows
generated_registry.json when n8n is upgraded. What stays hand-owned is only
what nodes.json cannot give us:

  * model_param: the NAME and SHAPE of the node's model parameter. These
    differ per provider and per typeVersion (`model` vs `modelName`; plain
    string vs resource-locator object). tests/test_ai_providers.py checks
    every entry against scripts/nodes.json, so drift fails a test instead of
    failing at deploy time.
  * default_model / models: n8n loads real model lists at runtime, so there
    is nothing to curate from. default_model is seeded from nodes.json (D8),
    except groq (n8n's own default, llama3-8b-8192, was shut down by Groq).
    Extend `models` by hand from n8n's model dropdown. Every provider also
    accepts a custom model ID (allow_custom_model).

Model IDs are stored WITHOUT any provider prefix. Gemini's node wants
"models/<id>"; full_model_id() adds it, so a user typing a custom
"gemini-2.5-flash" works the same as a curated entry.
"""

from dataclasses import dataclass

from app.core.n8n_operation_registry import get_chat_model_node

SHAPE_STRING = "string"
SHAPE_RESOURCE_LOCATOR = "resource_locator"


@dataclass(frozen=True)
class ModelParam:
    name: str  # parameter name on the n8n node
    shape: str  # SHAPE_STRING | SHAPE_RESOURCE_LOCATOR (at the emitted typeVersion)
    prefix: str = ""  # prepended to the stored model ID (gemini: "models/")


@dataclass(frozen=True)
class AIProvider:
    key: str  # catalog / registry service key
    display_name: str
    model_param: ModelParam
    default_model: str
    models: tuple = ()
    allow_custom_model: bool = True

    @property
    def chat_node(self) -> dict | None:
        """{"type", "typeVersion", "family"} from the registry, or None."""
        return get_chat_model_node(self.key)


AI_PROVIDERS: dict[str, AIProvider] = {
    p.key: p
    for p in (
        AIProvider(
            key="groq",
            display_name="Groq",
            model_param=ModelParam("model", SHAPE_STRING),
            default_model="openai/gpt-oss-20b",
            models=("openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"),
        ),
        AIProvider(
            key="openai",
            display_name="OpenAI",
            model_param=ModelParam("model", SHAPE_RESOURCE_LOCATOR),
            default_model="gpt-5-mini",
            models=("gpt-5-mini",),
        ),
        AIProvider(
            key="anthropic",
            display_name="Anthropic",
            model_param=ModelParam("model", SHAPE_RESOURCE_LOCATOR),
            default_model="claude-sonnet-5",
            models=("claude-sonnet-5",),
        ),
        AIProvider(
            key="gemini",
            display_name="Google Gemini",
            model_param=ModelParam("modelName", SHAPE_STRING, prefix="models/"),
            default_model="gemini-3-flash-preview",
            models=("gemini-3-flash-preview",),
        ),
        AIProvider(
            key="mistral",
            display_name="Mistral",
            model_param=ModelParam("model", SHAPE_STRING),
            default_model="mistral-small",
            models=("mistral-small",),
        ),
        AIProvider(
            key="openrouter",
            display_name="OpenRouter",
            model_param=ModelParam("model", SHAPE_STRING),
            default_model="openai/gpt-4.1-mini",
            models=("openai/gpt-4.1-mini",),
        ),
    )
}


def list_ai_providers() -> list[AIProvider]:
    return list(AI_PROVIDERS.values())


def get_ai_provider(key: str) -> AIProvider | None:
    return AI_PROVIDERS.get(key)


def full_model_id(provider_key: str, model: str) -> str:
    """The value to put in the node's model parameter: `model` with the
    provider's prefix added if it is not already there. Unknown provider ->
    returned unchanged."""
    provider = AI_PROVIDERS.get(provider_key)
    if not provider or not provider.model_param.prefix:
        return model
    prefix = provider.model_param.prefix
    return model if model.startswith(prefix) else prefix + model
