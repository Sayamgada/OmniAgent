"""
app/core/integration_catalog.py

Replaces the old hand-authored integration_catalog.py (now archived as
integration_catalog.legacy.py). This is a thin loader over
app/utils/generated_registry.json (built by scripts/generate_registry.py
directly from n8n's own nodes.json/credentials.json -- see that script's
docstring for the full derivation).

DELIBERATELY UNCHANGED CONTRACT: INTEGRATION_CATALOG and get_auth_option()
have the exact same shape/behavior as the legacy file. integration_service.py,
credential_checker.py, models/integration.py, schemas/integration.py, and
n8n_client.py need ZERO changes -- they only ever depended on this shape,
never on how it was produced.

Every one of the registry's connectable services is included here --
action_node, http_only (Datadog etc. -- no dedicated n8n node, but still a
real connectable credential), and multi_node_hub (AWS, Cohere, ...) alike.
Auth/credential connection is independent of whether a service has a
dedicated node; that's n8n_operation_registry.py's concern, not this one.

The two underscore-prefixed sections of the registry (_generic_auth_types,
_inline_auth_params) are NOT services a user connects to directly, so
they're excluded from INTEGRATION_CATALOG entirely.
"""

import json
from functools import lru_cache
from pathlib import Path

_REGISTRY_PATH = (
    Path(__file__).resolve().parent.parent / "utils" / "generated_registry.json"
)

_EXCLUDED_SECTIONS = {"_generic_auth_types", "_inline_auth_params"}


@lru_cache(maxsize=1)
def _load_catalog() -> dict:
    with open(_REGISTRY_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return {k: v for k, v in raw.items() if k not in _EXCLUDED_SECTIONS}


# Kept as a module-level name (not just a function) because the legacy file
# exposed it this way and callers do `from ... import INTEGRATION_CATALOG`
# then `.get(...)`/`.items()` on it directly. Since _load_catalog() is
# lru_cache'd, this is just a proxy to the same cached dict -- referencing
# INTEGRATION_CATALOG.<anything> after import triggers the load lazily on
# first real use via __getattr__ below, so import order at app startup
# doesn't matter.
class _CatalogProxy(dict):
    def __init__(self):
        super().__init__()
        self._loaded = False

    def _ensure(self):
        if not self._loaded:
            self.update(_load_catalog())
            self._loaded = True

    def __getitem__(self, key):
        self._ensure()
        return super().__getitem__(key)

    def get(self, key, default=None):
        self._ensure()
        return super().get(key, default)

    def items(self):
        self._ensure()
        return super().items()

    def keys(self):
        self._ensure()
        return super().keys()

    def values(self):
        self._ensure()
        return super().values()

    def __contains__(self, key):
        self._ensure()
        return super().__contains__(key)

    def __iter__(self):
        self._ensure()
        return super().__iter__()

    def __len__(self):
        self._ensure()
        return super().__len__()


INTEGRATION_CATALOG = _CatalogProxy()


def get_auth_option(service: str, option_id: str | None) -> dict | None:
    """
    Resolves which auth_option a request refers to. Omitting option_id falls
    back to the catalog's default_option (see generate_registry.py's
    default_option selection: the simplest non-OAuth method where one
    exists, since it needs no app registration -- e.g. Notion's API key over
    its OAuth2 option, Gmail's service-account over its OAuth2 option).
    """
    entry = INTEGRATION_CATALOG.get(service)
    if not entry:
        return None
    target_id = option_id or entry["default_option"]
    return next((o for o in entry["auth_options"] if o["option_id"] == target_id), None)


def reload_catalog() -> None:
    """
    Call after regenerating generated_registry.json (e.g. in a management
    command or right after scripts/generate_registry.py runs in the same
    process) to pick up changes without restarting the app. Not needed in
    normal request handling -- the catalog is loaded once and cached.
    """
    _load_catalog.cache_clear()
    INTEGRATION_CATALOG._loaded = False
    INTEGRATION_CATALOG.clear()
