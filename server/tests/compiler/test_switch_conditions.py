"""Stage 3.3 -- real Switch routing. Pure graph/prompt tests."""

from app.compiler import graph
from app.compiler.models import CompileReport, ConditionBranch, ResolvedNode, Step


def _node(n, kind="action_node", name=None):
    return ResolvedNode(step=n, kind=kind, name=name or f"N{n}")


def _build(source_kind, branches):
    steps = [
        Step(step=0, service="gmail", depends_on=[], is_trigger=True),
        Step(step=1, service="groq", depends_on=[0], condition=branches),
        Step(step=2, service="gmail", depends_on=[1], branch=branches[0].label),
    ]
    res = {
        0: _node(0, name="Trig"),
        1: _node(1, source_kind, "Decider"),
        2: _node(2, name="Send"),
    }
    report = CompileReport()
    conns, synth = graph.build_connections(steps, res, report)
    switch = next(n for n in synth if n.node_type.endswith("switch"))
    return switch, report


def _cond(switch, i):
    return switch.fixed_params["rules"]["values"][i]["conditions"]["conditions"][0]


def test_agent_branching_uses_routing_markers():
    sw, report = _build(
        "agent_root", [ConditionBranch("approved", ""), ConditionBranch("rejected", "")]
    )
    c0, c1 = _cond(sw, 0), _cond(sw, 1)
    assert c0["leftValue"] == graph.AI_ROUTING_LEFT_VALUE
    assert c0["operator"] == {"type": "string", "operation": "contains"}
    assert c0["rightValue"] == "DECISION: [approved]"
    assert c1["rightValue"] == "DECISION: [rejected]"
    assert not any("placeholder" in w for w in report.warnings)
    opts = sw.fixed_params["rules"]["values"][0]["conditions"]["options"]
    assert opts["caseSensitive"] is False


def test_explicit_expression_becomes_boolean_rule():
    sw, _ = _build(
        "action_node",
        [
            ConditionBranch("big", "$json.amount > 1000"),
            ConditionBranch("small", "{{ $json.amount <= 1000 }}"),
        ],
    )
    c0, c1 = _cond(sw, 0), _cond(sw, 1)
    assert c0["leftValue"] == "={{ $json.amount > 1000 }}"
    assert c1["leftValue"] == "={{ $json.amount <= 1000 }}"
    assert c0["operator"]["type"] == "boolean" and "rightValue" not in c0


def test_non_agent_without_expression_warns_and_keeps_placeholder():
    sw, report = _build(
        "action_node", [ConditionBranch("a", ""), ConditionBranch("b", "")]
    )
    assert _cond(sw, 0)["rightValue"] == ""
    assert sum("placeholder condition" in w for w in report.warnings) == 2


def test_output_order_and_labels_unchanged():
    sw, _ = _build(
        "agent_root", [ConditionBranch("approved", ""), ConditionBranch("rejected", "")]
    )
    vals = sw.fixed_params["rules"]["values"]
    assert [v["outputKey"] for v in vals] == ["approved", "rejected"]
    assert all(v["renameOutput"] is True for v in vals)


def test_agent_prompt_carries_routing_markers_only_when_branching():
    from app.compiler.compile import build_agent_prompt

    branching = build_agent_prompt("Decide.", True, ["approved", "rejected"])
    assert "DECISION: [approved]" in branching and "DECISION: [rejected]" in branching
    assert branching.startswith("=")
    plain = build_agent_prompt("Decide.", True)
    assert "Routing rule" not in plain
