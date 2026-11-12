"""
Golden snapshot tests for the three live-validated previews:

    linear   -> Gmail Trigger -> AI Agent (Groq) -> Gmail Send
    branching-> ... -> AI Agent -> Switch (approved/rejected) -> two Gmail sends
    fan-in   -> Gmail getAll + Slack search -> Merge -> AI Agent -> Gmail Send

plus linear_<provider> for each AI provider (Task B): the linear preview run
through apply_ai_selection() with that provider's default model, the same
path agent_router._load_steps_for() takes. The four raw cases above do NOT
go through apply_ai_selection, so their snapshots must stay unchanged.

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
from app.core.ai_providers import get_ai_provider, list_ai_providers, model_parameters
from app.core.n8n_operation_registry import get_chat_model_node
from app.services.ai_selection import apply_ai_selection

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
EXPECTED = FIXTURES / "expected"

CASES = {
    "linear": "test_preview.json",
    "branching": "test_preview_branching.json",
    "fanin": "test_preview_fanin.json",
    "leave_chained": "test_preview_leave_chained.json",
}

# case name -> (fixture, AI provider applied via apply_ai_selection)
AI_PROVIDER_KEYS = [p.key for p in list_ai_providers()]
PROVIDER_CASES = {f"linear_{k}": ("test_preview.json", k) for k in AI_PROVIDER_KEYS}
ALL_CASES = list(CASES) + list(PROVIDER_CASES)


def _load_steps(fixture_name: str, provider: str | None = None):
    p = json.loads((FIXTURES / fixture_name).read_text(encoding="utf-8"))
    if "preview_json" not in p:  # accept a bare inner preview_json too
        p = {"preview_json": p}
    if provider is not None:
        p = apply_ai_selection(p, provider)  # provider's default model
    return preview_to_steps(p)


def _steps_for(case: str):
    if case in PROVIDER_CASES:
        fixture, provider = PROVIDER_CASES[case]
        return _load_steps(fixture, provider)
    return _load_steps(CASES[case])


def _compile(case: str):
    result = compile(
        _steps_for(case),
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


@pytest.mark.parametrize("case", ALL_CASES)
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


@pytest.mark.parametrize("case", ALL_CASES)
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

    # one main output per rule, each wired to a downstream node, plus the
    # extra "unrecognized" fallback output wired to a NoOp sink
    main = wf["connections"][switch["name"]]["main"]
    assert len(main) == 3  # 2 rules + the fallback output
    assert all(len(branch) >= 1 for branch in main)
    assert main[2][0]["node"].startswith("Unrecognized decision")
    assert switch["parameters"]["options"]["fallbackOutput"] == "extra"
    sinks = _nodes_of(wf, ".noOp")
    assert [n["name"] for n in sinks] == [main[2][0]["node"]]


@pytest.mark.parametrize("case", ["linear", "branching", "fanin"])
def test_ai_agent_has_chat_model_wired_via_ai_language_model(case):
    wf = _compile(case)
    agents = _nodes_of(wf, ".agent")
    chat_models = _nodes_of(wf, ".lmChatGroq")
    assert len(agents) == 1 and len(chat_models) == 1
    conns = wf["connections"][chat_models[0]["name"]]
    assert conns["ai_languageModel"][0][0]["node"] == agents[0]["name"]


@pytest.mark.parametrize("key", AI_PROVIDER_KEYS)
def test_selected_provider_chat_model(key):
    """The chat model is the selected provider's node, at the registry's
    version, with the selected model in the node's own parameter shape,
    wired into the AI Agent via ai_languageModel."""
    wf = _compile(f"linear_{key}")
    node = get_chat_model_node(key)
    chats = [n for n in wf["nodes"] if n["type"] == node["type"]]
    assert len(chats) == 1
    chat = chats[0]
    assert chat["typeVersion"] == node["typeVersion"]
    assert chat["parameters"] == model_parameters(
        key, get_ai_provider(key).default_model
    )
    assert chat["credentials"], f"{key}: chat model has no credential"
    agents = _nodes_of(wf, ".agent")
    assert len(agents) == 1
    assert wf["connections"][chat["name"]]["ai_languageModel"][0][0]["node"] == (
        agents[0]["name"]
    )
    # no other provider's chat model sneaks in
    assert len([n for n in wf["nodes"] if ".lmChat" in n["type"]]) == 1


def _reachable(wf: dict, start: str) -> set:
    seen, stack = set(), [start]
    while stack:
        cur = stack.pop()
        for branch in wf["connections"].get(cur, {}).get("main", []):
            for t in branch or []:
                if t["node"] not in seen:
                    seen.add(t["node"])
                    stack.append(t["node"])
    return seen


def test_leave_chained_nested_switch_wiring():
    wf = _compile("leave_chained")
    switches = {n["name"]: n for n in _nodes_of(wf, ".switch")}
    assert sorted(switches) == ["Switch (step 1)", "Switch (step 2)"]

    def keys(s):
        return [r.get("outputKey") for r in s["parameters"]["rules"]["values"]]

    assert keys(switches["Switch (step 1)"]) == ["leave_request", "not_leave_request"]
    assert keys(switches["Switch (step 2)"]) == ["approved", "rejected"]

    first = wf["connections"]["Switch (step 1)"]["main"]
    second = wf["connections"]["Switch (step 2)"]["main"]

    # not_leave_request has nothing hanging off it; leave_request reaches Switch 2
    assert first[1] == []
    downstream = set()
    for t in first[0]:
        downstream |= {t["node"]} | _reachable(wf, t["node"])
    assert "Switch (step 2)" in downstream

    # approved / rejected go to two distinct Gmail sends
    gmail = {n["name"] for n in _nodes_of(wf, ".gmail")}
    approved, rejected = second[0][0]["node"], second[1][0]["node"]
    assert {approved, rejected} <= gmail and approved != rejected

    # each Switch's fallback goes to its own NoOp sink
    sinks = {n["name"] for n in _nodes_of(wf, ".noOp")}
    f1, f2 = first[2][0]["node"], second[2][0]["node"]
    assert {f1, f2} <= sinks and f1 != f2
