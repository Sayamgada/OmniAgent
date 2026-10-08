"""
verify_params.py <service> <resource> <operation>

Read-only. Run from anywhere:
    python scripts/verify_params.py slack message post
    python scripts/verify_params.py google_sheets sheet append

Shows exactly what the configure form will ask for, which structural
defaults compile() will add, and which authentication-selector value each
connectable credential option maps to.
"""

import importlib
import sys
from pathlib import Path

# make `app` importable regardless of the directory the script is run from
SERVER_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVER_ROOT))


def _import_param_schema():
    """Find param_schema.py wherever it lives under app/ and import it by its
    dotted path, instead of assuming the package is called app.compiler."""
    hits = sorted((SERVER_ROOT / "app").rglob("param_schema.py"))
    if not hits:
        sys.exit("param_schema.py not found under server/app")
    rel = hits[0].relative_to(SERVER_ROOT).with_suffix("")
    return importlib.import_module(".".join(rel.parts))


from app.core.n8n_operation_registry import get_service_entry  # noqa: E402

ps = _import_param_schema()

if len(sys.argv) != 4:
    sys.exit(__doc__)
service, resource, operation = sys.argv[1:4]
entry = get_service_entry(service)
node = (entry or {}).get("nodes", {}).get("standalone")
if not node:
    sys.exit(f"{service}: no standalone node in the registry")

t, v = node["type"], node["typeVersion"]
print(f"{service}: {t} typeVersion={v}  resource={resource} operation={operation}")
print(f"(using {ps.__name__})")
print("FORM FIELDS:")
for f in ps.get_required_params(t, v, resource, operation):
    modes = [m.name for m in getattr(f, "modes", [])]
    print(f"  - {f.name:22} type={f.type:16} default={f.default!r} modes={modes}")
if hasattr(ps, "get_structural_defaults"):
    print("STRUCTURAL DEFAULTS:", ps.get_structural_defaults(t, v, resource, operation))
    print("AUTH SELECTOR PER CONNECTABLE OPTION:")
    for opt in entry.get("auth_options", []):
        cred = opt["n8n_credential_type"]
        print(
            f"  {opt['option_id']:28} {cred:34} -> {ps.auth_params_for_credential(t, v, cred)}"
        )
else:
    print(
        "NOTE: this param_schema.py is the OLD version -- the patched one is not in place yet."
    )
