"""
Guards the end of Phase 1.4/1.5: the module-level n8n functions are gone, so a call site
that was missed would otherwise only fail when that line runs. This fails at test time.
"""

import ast
from pathlib import Path

SERVER = Path(__file__).resolve().parents[1]
# Names that legitimately live at module level in app/services/n8n_client.py.
ALLOWED = {
    "N8nClient",
    "N8nClientError",
    "N8nNotConfigured",
    "get_n8n_client",
    "evict_sessions",
}


def _offenders() -> list[str]:
    out = []
    for sub in ("app", "scripts"):
        for path in (SERVER / sub).rglob("*.py"):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                rel = path.relative_to(SERVER)
                if (
                    isinstance(node, ast.Attribute)
                    and isinstance(node.value, ast.Name)
                    and node.value.id == "n8n_client"
                    and node.attr not in ALLOWED
                ):
                    out.append(f"{rel}:{node.lineno} n8n_client.{node.attr}")
                if (
                    isinstance(node, ast.ImportFrom)
                    and node.module == "app.services.n8n_client"
                ):
                    for alias in node.names:
                        if alias.name not in ALLOWED:
                            out.append(f"{rel}:{node.lineno} import {alias.name}")
    return out


def test_no_module_level_n8n_client_usage():
    assert _offenders() == []
