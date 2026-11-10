"""
Stale-instance guard for per-user n8n (plan task 1.6).

Every credential id (Integration.n8n_credential_id) and workflow id (Agent.n8n_workflow_id)
is only meaningful on the n8n instance that created it. Each user has an
n8n_connection_id (users table) that is re-minted whenever they point OmniAgent at a
different n8n URL, and every Integration / Agent row is stamped with that id when it is
written. A row is STALE when its stamp is not the user's current connection id:

    stamp NULL             -> unstamped (legacy row), cannot be trusted
    current id NULL        -> the user has no n8n connected, so nothing is current
    stamp != current id    -> written for a previous instance

Stale rows are never sent to n8n (the same id could be a different object there, since older
n8n versions use sequential ids), never count as "connected", and can always be deleted from
Postgres without n8n being reachable.

Use is_stale() for in-Python checks and fresh_clause() for SQL filters. Do NOT write
`Model.n8n_connection_id == user.n8n_connection_id` by hand: when the user's id is None,
SQLAlchemy renders that as `IS NULL`, which would match every unstamped row.
"""

from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import false


def is_stale(stamp: Optional[uuid.UUID], current: Optional[uuid.UUID]) -> bool:
    """True unless both ids exist and are equal (compared as strings, so UUID/str mix is safe)."""
    if stamp is None or current is None:
        return True
    return str(stamp) != str(current)


def fresh_clause(column, current: Optional[uuid.UUID]):
    """
    SQL predicate matching only rows stamped with `current`. Never matches when `current`
    is None, and a NULL stamp never equals anything, so unstamped rows are always excluded.
    """
    if current is None:
        return false()
    return column == current
