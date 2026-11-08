"""
Empirical check of the n8n calls the lifecycle endpoints rely on, against YOUR
n8n instance (n8n_client's own docstrings say deactivate/delete were never
verified). Creates a throwaway hourly-schedule workflow, walks it through
get -> activate -> executions -> deactivate -> delete, prints what n8n
returns at each step, and always tries to delete it at the end.

    python -m scripts.verify_n8n_lifecycle --user-email you@example.com

Run from server/. Uses that user's own n8n connection (PUT /users/me/n8n).
"""

import argparse
import asyncio
import json

from cryptography.fernet import InvalidToken

from app.database import get_postgres_db
from app.models.user import User
from app.services.n8n_client import N8nNotConfigured, get_n8n_client

WORKFLOW = {
    "name": "omniagent-lifecycle-check (safe to delete)",
    "nodes": [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "name": "Schedule Trigger",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [0, 0],
            "parameters": {
                "rule": {"interval": [{"field": "hours", "hoursInterval": 1}]}
            },
        },
        {
            "id": "22222222-2222-2222-2222-222222222222",
            "name": "No Operation",
            "type": "n8n-nodes-base.noOp",
            "typeVersion": 1,
            "position": [250, 0],
            "parameters": {},
        },
    ],
    "connections": {
        "Schedule Trigger": {
            "main": [[{"node": "No Operation", "type": "main", "index": 0}]]
        }
    },
    "settings": {},
}


async def step(label, coro):
    try:
        out = await coro
        print(f"OK   {label}")
        return out
    except Exception as e:  # noqa: BLE001 -- this is a diagnostic script
        status = getattr(e, "status_code", None)
        print(f"FAIL {label}: {type(e).__name__} status={status} {e}")
        return None


async def main(n8n):
    wf = await step("create_workflow", n8n.create_workflow(WORKFLOW))
    if not wf:
        return
    wf_id = wf["id"]
    try:
        got = await step("get_workflow (expect active=False)", n8n.get_workflow(wf_id))
        print("     active =", (got or {}).get("active"))
        await step("activate_workflow", n8n.activate_workflow(wf_id))
        got = await step("get_workflow (expect active=True)", n8n.get_workflow(wf_id))
        print("     active =", (got or {}).get("active"))
        ex = await step("list_executions", n8n.list_executions(wf_id, 5))
        if ex is not None:
            print(
                "     keys =", list(ex.keys()), "| count =", len(ex.get("data") or [])
            )
            if ex.get("data"):
                print("     sample =", json.dumps(ex["data"][0])[:300])
        await step("deactivate_workflow", n8n.deactivate_workflow(wf_id))
        got = await step("get_workflow (expect active=False)", n8n.get_workflow(wf_id))
        print("     active =", (got or {}).get("active"))
    finally:
        await step("delete_workflow", n8n.delete_workflow(wf_id))
        await step(
            "get_workflow after delete (expect FAIL status=404)",
            n8n.get_workflow(wf_id),
        )


def _client_for(email: str):
    gen = get_postgres_db()
    db = next(gen) if hasattr(gen, "__next__") else gen
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise SystemExit(f"No user with email {email!r}")
    try:
        return get_n8n_client(user)
    except (N8nNotConfigured, InvalidToken):
        raise SystemExit(
            f"{email} has no usable n8n connection. Connect one first (PUT /users/me/n8n)."
        )


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--user-email", required=True)
    asyncio.run(main(_client_for(ap.parse_args().user_email)))
