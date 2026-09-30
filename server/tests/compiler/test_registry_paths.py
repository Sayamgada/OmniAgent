"""
Guards against the registry regressions found in Milestone Report #2:

1. generate_registry.py silently wrote to scripts/ while the app read from
   app/utils/ -- so "successful" regenerations changed nothing the app used.
2. A new top-level registry section (_utility_nodes) leaked into
   INTEGRATION_CATALOG as if it were a real service and crashed generation.

Nothing here regenerates the registry; it only checks that the writer's path
and the reader's path are the same file, and that the file on disk has the
shape the accessors and catalog expect.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.core import n8n_operation_registry as reg
from app.core.integration_catalog import INTEGRATION_CATALOG
from scripts import generate_registry as gen

UTILITY_NAMES = ["if", "switch", "merge", "set", "code", "noOp", "filter", "wait"]


def test_generator_writes_where_the_app_reads():
    assert gen.OUT_PATH.resolve() == reg._REGISTRY_PATH.resolve(), (
        f"generate_registry.py writes to {gen.OUT_PATH} but the app reads "
        f"{reg._REGISTRY_PATH} -- regenerations would silently do nothing"
    )
    assert reg._REGISTRY_PATH.exists()


def test_registry_has_all_utility_nodes_with_real_versions():
    for name in UTILITY_NAMES:
        node = reg.get_utility_node(name)
        assert node is not None, f"_utility_nodes missing {name!r}"
        assert node["type"].startswith("n8n-nodes-base."), node
        assert isinstance(node["typeVersion"], (int, float)), node


def test_underscore_sections_are_not_services():
    # accessors must not treat internal sections as services...
    assert reg.get_service_entry("_utility_nodes") is None
    # ...and neither may the integration catalog (its iteration crashed
    # workflow generation once when _utility_nodes leaked in).
    leaked = [k for k in INTEGRATION_CATALOG if str(k).startswith("_")]
    assert not leaked, f"internal registry sections leaked into catalog: {leaked}"


def test_every_catalog_entry_has_the_fields_generation_reads():
    # workflow_generator._build_service_whitelist reads entry["category"];
    # a malformed entry there is a 502 on /agents/extract-workflow.
    missing = [
        k
        for k, entry in INTEGRATION_CATALOG.items()
        if not isinstance(entry, dict) or "category" not in entry
    ]
    assert not missing, f"catalog entries without a category: {missing[:10]}"
