"""Stage 3.2 -- Aggregate synthesis. Pure graph tests (no registry/n8n)."""

from app.compiler import graph
from app.compiler.models import CompileReport, ConditionBranch, ResolvedNode, Step


def _step(n, deps, **kw):
    return Step(step=n, service=kw.pop("service", f"svc{n}"), depends_on=deps, **kw)


def _node(n, kind="action_node", name=None):
    return ResolvedNode(step=n, kind=kind, name=name or f"N{n}")


def _edges(conns):
    return {(c.source_name, c.target_name, c.target_input) for c in conns}


def test_trigger_only_agent_gets_no_aggregate():
    steps = [_step(0, [], is_trigger=True), _step(1, [0])]
    res = {0: _node(0, name="Trig"), 1: _node(1, "agent_root", "Agent")}
    conns, synth = graph.build_connections(steps, res, CompileReport())
    assert synth == []
    assert ("Trig", "Agent", "main") in _edges(conns)


def test_agent_after_action_step_gets_aggregate():
    steps = [_step(0, [], is_trigger=True), _step(1, [0]), _step(2, [1])]
    res = {
        0: _node(0, name="Trig"),
        1: _node(1, name="List"),
        2: _node(2, "agent_root", "Agent"),
    }
    conns, synth = graph.build_connections(steps, res, CompileReport())
    assert [n.name for n in synth] == [graph.aggregate_node_name(2)]
    assert synth[0].fixed_params == graph.AGGREGATE_FIXED_PARAMS
    e = _edges(conns)
    assert ("List", graph.aggregate_node_name(2), "main") in e
    assert (graph.aggregate_node_name(2), "Agent", "main") in e
    assert ("List", "Agent", "main") not in e


def test_fan_in_is_merge_then_aggregate_then_agent():
    steps = [
        _step(0, [], is_trigger=True),
        _step(1, [0]),
        _step(2, [0]),
        _step(3, [1, 2]),
    ]
    res = {
        0: _node(0, name="Trig"),
        1: _node(1, name="A"),
        2: _node(2, name="B"),
        3: _node(3, "agent_root", "Agent"),
    }
    conns, synth = graph.build_connections(steps, res, CompileReport())
    names = {n.name for n in synth}
    assert names == {"Merge into step 3", graph.aggregate_node_name(3)}
    e = _edges(conns)
    agg = graph.aggregate_node_name(3)
    assert ("Merge into step 3", agg, "main") in e
    assert (agg, "Agent", "main") in e
    assert ("Merge into step 3", "Agent", "main") not in e


def test_branch_routed_agent_goes_switch_aggregate_agent():
    steps = [
        _step(0, [], is_trigger=True),
        _step(
            1,
            [0],
            condition=[
                ConditionBranch("approved", ""),
                ConditionBranch("rejected", ""),
            ],
        ),
        _step(2, [1], branch="approved"),
    ]
    res = {
        0: _node(0, name="Trig"),
        1: _node(1, name="Check"),
        2: _node(2, "agent_root", "Agent"),
    }
    conns, synth = graph.build_connections(steps, res, CompileReport())
    agg = graph.aggregate_node_name(2)
    e = _edges(conns)
    assert ("Switch (step 1)", agg, "main") in e
    assert (agg, "Agent", "main") in e


def test_missing_registry_entry_warns_and_falls_back(monkeypatch):
    real = graph.get_utility_node
    monkeypatch.setattr(
        graph,
        "get_utility_node",
        lambda name: None if name == "aggregate" else real(name),
    )
    steps = [_step(0, [], is_trigger=True), _step(1, [0]), _step(2, [1])]
    res = {
        0: _node(0, name="Trig"),
        1: _node(1, name="List"),
        2: _node(2, "agent_root", "Agent"),
    }
    report = CompileReport()
    conns, synth = graph.build_connections(steps, res, report)
    assert synth == []
    assert ("List", "Agent", "main") in _edges(conns)
    assert any("aggregate" in w for w in report.warnings)
