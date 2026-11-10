"""
Real CredentialResolver, backed by the same `integrations` table and the
same (user_id, service) lookup convention already used by
integration_service.list_integrations_with_status() and
check_required_integrations() -- see app/services/integration_service.py.

This is deliberately NOT keyed by n8n_credential_type: a real user may
have connected a service via a different auth_option than the one
instantiate.py assumed as the service's default (e.g. Gmail via
gmailOAuth2, while the compiler's default resolution assumes googleApi).
The resolver reports back whichever credential type the user's row
actually holds; compile.py keys the compiled node's `credentials` dict
by that REPORTED type, not by the type it asked for (see the two call
sites in compile.py).

A row with oauth_pending=True has is_active=False until the status poll
in integration_service.check_oauth_status() confirms n8n attached real
tokens (see Integration's docstring) -- filtering on is_active == True
here means an in-progress OAuth connection is correctly treated as "not
yet available," the same way check_required_integrations() already does.

Rows are also filtered to the user's CURRENT n8n instance (n8n_connection_id): a credential
saved for a previous instance has an id that means nothing on the instance the workflow will
be deployed to, so it is treated as "not connected" and the compiler reports it as missing.
The id is a required keyword so a call site cannot forget the filter.
"""

from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.core.n8n_stale import fresh_clause
from app.models.integration import Integration
from .interfaces import CredentialResolver


class PostgresCredentialResolver(CredentialResolver):
    def __init__(self, db: Session, *, n8n_connection_id: Optional[uuid.UUID]):
        self._db = db
        self._n8n_connection_id = n8n_connection_id

    def resolve(
        self, user_id: str, service: str, n8n_credential_type: str
    ) -> Optional[dict[str, str]]:
        row = (
            self._db.query(Integration)
            .filter(
                Integration.user_id == uuid.UUID(str(user_id)),
                Integration.service == service,
                Integration.is_active == True,  # noqa: E712 -- SQLAlchemy filter
                fresh_clause(Integration.n8n_connection_id, self._n8n_connection_id),
            )
            .first()
        )
        if row is None:
            return None

        return {
            "id": row.n8n_credential_id,
            "name": row.display_name or service,
            "type": row.n8n_credential_type,
        }
