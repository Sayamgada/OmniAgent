"""
Golden snapshot tests for the three live-validated previews:

    linear   -> Gmail Trigger -> AI Agent (Groq) -> Gmail Send
    branching-> ... -> AI Agent -> Switch (approved/rejected) -> two Gmail sends
    fan-in   -> Gmail getAll + Slack search -> Merge -> AI Agent -> Gmail Send

Each fixture is compiled with PlaceholderParamProvider + DummyCredentialResolver
and compared to a stored expected workflow (tests/fixtures/expected/*.json).
Node ids are normalised (they are not meaningful), everything else -- node
types, typeVersions, parameters, connections, positions -- must match exactly.

The expected files must be generated from output you have ALREADY validated
live in n8n, then reviewed by eye before being committed:

    $env:UPDATE_GOLDEN = "1"; python -m pytest tests/compiler/test_golden.py
    Remove-Item Env:UPDATE_GOLDEN

Structural assertions below run independently of the snapshots, so a wrongly
generated snapshot cannot hide a broken Merge/Switch/tool-variant regression.
"""

import json
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.compiler import DummyCredentialResolver, PlaceholderParamProvider, compile
from app.compiler.loader import preview_to_steps

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
EXPECTED = FIXTURES / "expected"

CASES = {
    "linear": "test_preview.json",
    "branching": "test_preview_branching.json",
    "fanin": "test_preview_fanin.json",
}


def _load_steps(fixture_name: str):
    p = json.loads((FIXTURES / fixture_name).read_text(encoding="utf-8"))
    if "preview_json" not in p:  # accept a bare inner preview_json too
        p = {"preview_json": p}
    return preview_to_steps(p)


def _compile(case: str):
    result = compile(
        _load_steps(CASES[case]),
        PlaceholderParamProvider(),
        DummyCredentialResolver(),
        user_id="golden-user",
        workflow_name=f"golden-{case}",
    )
    assert result.report.is_deployable, result.report.needs_user_input
    return result.workflow_json


def _normalise(wf: dict) -> dict:
    """Blank out node ids (random/opaque); keep everything else."""
    wf = json.loads(json.dumps(wf))  # deep copy, JSON-safe
    for node in wf.get("nodes", []):
        node["id"] = "<id>"
    return wf


def _nodes_of(wf: dict, suffix: str):
    return [n for n in wf["nodes"] if n["type"].endswith(suffix)]


@pytest.mark.parametrize("case", list(CASES))
def test_matches_golden_snapshot(case):
    actual = _normalise(_compile(case))
    path = EXPECTED / f"{case}.json"

    if os.environ.get("UPDATE_GOLDEN") == "1":
        EXPECTED.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(actual, indent=2, sort_keys=True), encoding="utf-8")
        pytest.skip(f"wrote {path} -- review it, then re-run without UPDATE_GOLDEN")

    assert path.exists(), (
        f"{path} missing -- generate it once with UPDATE_GOLDEN=1 from output "
        f"you have already validated live in n8n"
    )
    expected = json.loads(path.read_text(encoding="utf-8"))
    assert actual == expected


# ---- structural assertions, independent of the snapshots ------------------


@pytest.mark.parametrize("case", list(CASES))
def test_no_tool_variants_and_unique_ids(case):
    wf = _compile(case)
    assert not [n for n in wf["nodes"] if "Hitl" in n["type"]], (
        "a data-dependency step was resolved to a tool/HITL variant "
        "(see the resolve.py ai_tool_steps decision)"
    )
    ids = [n["id"] for n in wf["nodes"]]
    assert len(ids) == len(set(ids))


def test_fanin_has_merge_with_two_inputs():
    wf = _compile("fanin")
    merges = _nodes_of(wf, ".merge")
    assert len(merges) == 1
    merge = merges[0]
    assert merge["parameters"]["numberInputs"] == 2

    # both upstream steps feed a distinct Merge input index (0 and 1)
    landing = set()
    for outputs in wf["connections"].values():
        for branch in outputs.get("main", []):
            for target in branch or []:
                if target["node"] == merge["name"]:
                    landing.add(target["index"])
    assert landing == {0, 1}


def test_branching_has_switch_with_two_labelled_outputs():
    wf = _compile("branching")
    switches = _nodes_of(wf, ".switch")
    assert len(switches) == 1
    switch = switches[0]
    rules = switch["parameters"]["rules"]["values"]
    assert len(rules) == 2
    assert [r.get("outputKey") for r in rules] == ["approved", "rejected"]

    # one main output per rule, each wired to a downstream node
    main = wf["connections"][switch["name"]]["main"]
    assert len(main) == 2
    assert all(len(branch) >= 1 for branch in main)


@pytest.mark.parametrize("case", ["linear", "branching", "fanin"])
def test_ai_agent_has_chat_model_wired_via_ai_language_model(case):
    wf = _compile(case)
    agents = _nodes_of(wf, ".agent")
    chat_models = _nodes_of(wf, ".lmChatGroq")
    assert len(agents) == 1 and len(chat_models) == 1
    conns = wf["connections"][chat_models[0]["name"]]
    assert conns["ai_languageModel"][0][0]["node"] == agents[0]["name"]
