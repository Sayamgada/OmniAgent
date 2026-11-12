"""
app/services/ai_selection.py

Task B (provider and model selection), decision D7.

The generation LLM always writes the AI step of a workflow with the
placeholder service "groq" (AI_PLACEHOLDER_SERVICE). The person building
the agent picks the real provider and model; apply_ai_selection() rewrites
the placeholder into that choice. It runs on every load of a preview, so
the cached preview in Mongo stays provider-agnostic and one cached preview
serves every provider. Previews are shared between users, which is why the
choice is never written back to the preview itself.

WHICH STEPS ARE "AI STEPS"
------------------------------------------------------------------------------
Steps the server enrichment marked n8n_resolution_kind == "ai_subnode"
(with an n8n_subnode block), NOT steps whose service is "groq". That makes
the function safe to run twice (after a rewrite the service is no longer
"groq"), and it never touches a hub provider used for its own action, e.g.
an "openai" image-generation step (decision D9).
"""

import copy

from app.core.ai_providers import get_ai_provider, model_parameters

AI_PLACEHOLDER_SERVICE = "groq"
_AI_STEP_KIND = "ai_subnode"
MAX_MODEL_LENGTH = 255  # agents.ai_model / users.default_ai_model column size


class AISelectionError(ValueError):
    """Unknown provider, provider without a chat-model node, or a model the
    provider does not allow."""


def default_selection() -> tuple[str, str]:
    """(provider, model) used when the request carries no choice."""
    provider = get_ai_provider(AI_PLACEHOLDER_SERVICE)
    return provider.key, provider.default_model


def selection_for(
    user=None, provider: str | None = None, model: str | None = None
) -> tuple[str, str]:
    """
    The (provider, model) to use, in order of precedence:

      1. the request's provider (with the request's model, else the user's
         saved model if the saved provider is the same one, else the
         provider's default model);
      2. the user's saved default (users.default_ai_provider/_model);
      3. the placeholder provider (groq) and its default model.

    A saved default that no longer exists in the catalog is ignored, not an
    error; an unknown provider in the REQUEST raises AISelectionError.
    """
    provider = (provider or "").strip() or None
    model = (model or "").strip() or None
    saved_provider = (getattr(user, "default_ai_provider", None) or "").strip() or None
    saved_model = (getattr(user, "default_ai_model", None) or "").strip() or None
    if saved_provider and get_ai_provider(saved_provider) is None:
        saved_provider = saved_model = None

    if provider is None:
        provider = saved_provider or AI_PLACEHOLDER_SERVICE
    if model is None and provider == saved_provider:
        model = saved_model

    p = get_ai_provider(provider)
    if p is None:
        raise AISelectionError(f"Unknown AI provider {provider!r}")
    model = model or p.default_model
    if len(model) > MAX_MODEL_LENGTH:
        raise AISelectionError(f"Model ID longer than {MAX_MODEL_LENGTH} characters")
    if not p.allow_custom_model and model not in p.models:
        raise AISelectionError(f"Model {model!r} is not offered for {provider!r}")
    return p.key, model


def is_ai_step(step) -> bool:
    return (
        isinstance(step, dict)
        and step.get("n8n_resolution_kind") == _AI_STEP_KIND
        and isinstance(step.get("n8n_subnode"), dict)
    )


def _non_ai_services(preview: dict) -> set:
    """Services still needed for something other than the AI step."""
    used = set()
    trigger = preview.get("trigger")
    if isinstance(trigger, dict) and trigger.get("service"):
        used.add(trigger["service"])
    for step in preview.get("workflow", []) or []:
        if isinstance(step, dict) and not is_ai_step(step) and step.get("service"):
            used.add(step["service"])
    return used


def _rewrite_required(required, provider, previous_provider, preview: dict) -> list:
    """
    Drop the placeholder entry (and the previously selected provider's, when
    re-applying), unless that service is still used by a non-AI step; then
    make sure the chosen provider is listed exactly once.
    """
    required = [r for r in (required or []) if isinstance(r, dict)]
    keep = _non_ai_services(preview)
    drop = {AI_PLACEHOLDER_SERVICE, previous_provider} - keep - {None}
    out = [r for r in required if r.get("service") not in drop]
    if not any(r.get("service") == provider.key for r in out):
        out.append(
            {
                "service": provider.key,
                "display_name": f"AI Provider ({provider.display_name})",
                "required": True,
            }
        )
    return out


def apply_ai_selection(workflow: dict, provider: str, model: str | None = None) -> dict:
    """
    Returns a NEW workflow dict (the input is never modified) whose AI steps
    use `provider` / `model`:

      step["service"]                         -> provider
      step["n8n_subnode"]["chat_model_node_type"]    -> from the registry
      step["n8n_subnode"]["chat_model_type_version"] -> from the registry
      step["n8n_subnode"]["model_parameters"]        -> the node's model param

    plus required_integrations rewritten (see _rewrite_required) and
    workflow["ai_selection"] = {"provider", "model"}. A blank model means the
    provider's default_model. A workflow with no AI step comes back unchanged.
    Raises AISelectionError for an invalid choice.
    """
    p = get_ai_provider(provider) if provider else None
    if p is None:
        raise AISelectionError(f"Unknown AI provider {provider!r}")
    node = p.chat_node
    if node is None:
        raise AISelectionError(
            f"AI provider {provider!r} has no chat-model node in the registry"
        )
    model = (model or "").strip() or p.default_model
    if not p.allow_custom_model and model not in p.models:
        raise AISelectionError(f"Model {model!r} is not offered for {provider!r}")

    out = copy.deepcopy(workflow)
    preview = out.get("preview_json")
    if not isinstance(preview, dict):
        return out
    ai_steps = [s for s in preview.get("workflow", []) or [] if is_ai_step(s)]
    if not ai_steps:
        return out

    params = model_parameters(p.key, model)
    for step in ai_steps:
        step["service"] = p.key
        sub = step["n8n_subnode"]
        sub["chat_model_node_type"] = node["type"]
        sub["chat_model_type_version"] = node["typeVersion"]
        sub["model_parameters"] = copy.deepcopy(params)

    previous = (out.get("ai_selection") or {}).get("provider")
    out["required_integrations"] = _rewrite_required(
        out.get("required_integrations"), p, previous, preview
    )
    out["ai_selection"] = {"provider": p.key, "model": model}
    return out
