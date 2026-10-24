# app/services/workflow_revision.py
"""
Helpers for the extract-workflow edit loop (revising a previously generated
preview instead of re-running the FAISS cache).

Kept free of Mongo/FAISS/Groq imports so it can be unit-tested on its own.
"""

from __future__ import annotations

import json
import re
import secrets
from typing import Any, Awaitable, Callable, Optional

# " (edit a1b2)" -- stripped before adding a new one so repeated edits do not
# stack suffixes ("X (edit a1b2) (edit c3d4)").
_SUFFIX_RE = re.compile(r"\s\(edit [0-9a-f]{4,8}\)$")

# The only parts of a stored preview the model needs to revise it. Everything
# else on the Mongo doc (_id, created_at, ...) stays out of the prompt.
_BASE_KEYS = (
    "automation_name",
    "automation_description",
    "required_integrations",
    "preview_json",
)


def base_automation_name(name: str) -> str:
    """`name` without a trailing ' (edit xxxx)' revision suffix."""
    return _SUFFIX_RE.sub("", name)


async def unique_revision_name(
    previous_name: str,
    is_taken: Callable[[str], Awaitable[bool]],
    *,
    token_fn: Optional[Callable[[], str]] = None,
    max_tries: int = 20,
) -> str:
    """
    A fresh, unused automation_name for a revision of `previous_name`.

    automation_name has a UNIQUE index in Mongo and previews are shared across
    users, so a revision must never reuse (or overwrite) the original's name.
    """
    base = base_automation_name(previous_name)
    for attempt in range(max_tries):
        token = token_fn() if token_fn else secrets.token_hex(2 if attempt < 10 else 4)
        candidate = f"{base} (edit {token})"
        if not await is_taken(candidate):
            return candidate
    raise RuntimeError(
        f"could not find an unused revision name for {previous_name!r} "
        f"after {max_tries} tries"
    )


def render_edit_section(previous: dict[str, Any]) -> str:
    """Text appended to the Groq user message when revising `previous`."""
    base = {k: previous[k] for k in _BASE_KEYS if k in previous}
    existing = json.dumps(base, indent=2, ensure_ascii=False, default=str)
    return (
        "Revision Mode:\n"
        'The user is REVISING the existing automation below. "User Request" is '
        "the user's complete, updated request. Return the full automation JSON "
        "(same schema, same rules as always) with the updated request applied. "
        "Keep every step, integration and parameter that the updated request does "
        "not change or contradict; add, remove or modify only what it requires. "
        "Do not return a diff.\n\n"
        "Existing Automation:\n"
        f"{existing}\n"
    )
