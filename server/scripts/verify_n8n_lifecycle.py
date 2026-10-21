"""
Empirical check of the n8n calls the lifecycle endpoints rely on, against YOUR
n8n instance (n8n_client's own docstrings say deactivate/delete were never
verified). Creates a throwaway hourly-schedule workflow, walks it through
get -> activate -> executions -> deactivate -> delete, prints what n8n
returns at each step, and always tries to delete it at the end.

    python -m scripts.verify_n8n_lifecycle

Run from server/. Needs N8N_BASE_URL / N8N_API_KEY in your env as usual.
"""

import asyncio
import json

from app.services import n8n_client

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


async def main():
    wf = await step("create_workflow", n8n_client.create_workflow(WORKFLOW))
    if not wf:
        return
    wf_id = wf["id"]
    try:
        got = await step(
            "get_workflow (expect active=False)", n8n_client.get_workflow(wf_id)
        )
        print("     active =", (got or {}).get("active"))
        await step("activate_workflow", n8n_client.activate_workflow(wf_id))
        got = await step(
            "get_workflow (expect active=True)", n8n_client.get_workflow(wf_id)
        )
        print("     active =", (got or {}).get("active"))
        ex = await step("list_executions", n8n_client.list_executions(wf_id, 5))
        if ex is not None:
            print(
                "     keys =", list(ex.keys()), "| count =", len(ex.get("data") or [])
            )
            if ex.get("data"):
                print("     sample =", json.dumps(ex["data"][0])[:300])
        await step("deactivate_workflow", n8n_client.deactivate_workflow(wf_id))
        got = await step(
            "get_workflow (expect active=False)", n8n_client.get_workflow(wf_id)
        )
        print("     active =", (got or {}).get("active"))
    finally:
        await step("delete_workflow", n8n_client.delete_workflow(wf_id))
        await step(
            "get_workflow after delete (expect FAIL status=404)",
            n8n_client.get_workflow(wf_id),
        )


if __name__ == "__main__":
    asyncio.run(main())
