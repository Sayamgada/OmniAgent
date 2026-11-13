"""Phase 3.1 -- rule-based branches: structured Switch rules, the
"otherwise" branch on the fallback output, and a fork on the trigger's own
payload. Pure loader/graph tests; the compiled end-to-end shape is covered
by the trigger_rules golden snapshot in test_golden.py."""

import json
from pathlib import Path

import pytest

from app.compiler import graph
from app.compiler.loader import preview_to_steps
from app.compiler.models import (
    RULE_OPERATORS,
    BranchRule,
    CompileReport,
    ConditionBranch,
    ResolvedNode,
    Step,
)

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"


def _node(n, kind="action_node", name=None):
    return ResolvedNode(step=n, kind=kind, name=name or f"N{n}")


def _build(branches, source_kind="action_node", branch_steps=None):
    """Trigger -> Decider (carries `branches`) -> one step per label in
    `branch_steps` (default: every label)."""
    labels = branch_steps if branch_steps is not None else [b.label for b in branches]
    steps = [
        Step(step=0, service="webhook", depends_on=[], is_trigger=True),
        Step(step=1, service="x", depends_on=[0], condition=branches),
    ]
    res = {0: _node(0, name="Trig"), 1: _node(1, source_kind, "Decider")}
    for i, label in enumerate(labels, start=2):
        steps.append(Step(step=i, service="gmail", depends_on=[1], branch=label))
        res[i] = _node(i, name=f"Do {label}")
    report = CompileReport()
    conns, synth = graph.build_connections(steps, res, report)
    switch = next(n for n in synth if n.node_type.endswith("switch"))
    return switch, conns, synth, report


def _cond(switch, i):
    return switch.fixed_params["rules"]["values"][i]["conditions"]["conditions"][0]


def _from(conns, source):
    return {(c.source_index, c.target_name) for c in conns if c.source_name == source}


# ---- operators -------------------------------------------------------------

EXPECTED = {
    "equals": ({"type": "string", "operation": "equals"}, "paid", "paid"),
    "not_equals": ({"type": "string", "operation": "notEquals"}, "paid", "paid"),
    "contains": ({"type": "string", "operation": "contains"}, "urgent", "urgent"),
    "gt": ({"type": "number", "operation": "gt"}, 500, 500),
    "lt": ({"type": "number", "operation": "lt"}, "2.5", 2.5),
    "is_empty": (
        {"type": "string", "operation": "empty", "singleValue": True}, None, ""),
    "is_not_empty": (
        {"type": "string", "operation": "notEmpty", "singleValue": True}, None, ""),
    "is_true": (
        {"type": "boolean", "operation": "true", "singleValue": True}, None, ""),
    "is_false": (
        {"type": "boolean", "operation": "false", "singleValue": True}, None, ""),
}


def test_every_ir_operator_has_an_n8n_shape():
    assert set(RULE_OPERATORS) == set(graph.RULE_OPERATOR_SHAPES) == set(EXPECTED)


@pytest.mark.parametrize("op", sorted(EXPECTED))
def test_operator_shape(op):
    operator, value, right = EXPECTED[op]
    sw, _, _, report = _build(
        [ConditionBranch("a", rule=BranchRule("amount", op, value)),
         ConditionBranch("b", otherwise=True)]
    )
    c = _cond(sw, 0)
    assert c["leftValue"] == "={{ $json.amount }}"
    assert c["operator"] == operator
    assert c["rightValue"] == right
    opts = sw.fixed_params["rules"]["values"][0]["conditions"]["options"]
    assert opts["typeValidation"] == "loose"
    assert not report.warnings


def test_number_value_given_as_text_is_sent_as_a_number():
    sw, *_ = _build([ConditionBranch("a", rule=BranchRule("amount", "gt", "600"))])
    assert _cond(sw, 0)["rightValue"] == 600


def test_string_value_formatting():
    sw, *_ = _build(
        [ConditionBranch("a", rule=BranchRule("count", "equals", 3.0)),
         ConditionBranch("b", rule=BranchRule("flag", "equals", True))]
    )
    assert _cond(sw, 0)["rightValue"] == "3"
    assert _cond(sw, 1)["rightValue"] == "true"


def test_unusable_number_falls_back_to_placeholder_with_warnings():
    sw, _, _, report = _build(
        [ConditionBranch("a", rule=BranchRule("amount", "gt", "lots"))]
    )
    assert _cond(sw, 0)["rightValue"] == ""  # placeholder rule
    assert any("unusable value" in w for w in report.warnings)
    assert any("placeholder condition" in w for w in report.warnings)


def test_rule_wins_over_expression_and_ai_marker():
    sw, *_ = _build(
        [ConditionBranch("a", expression="$json.x > 1",
                         rule=BranchRule("amount", "gt", 5))],
        source_kind="agent_root",
    )
    assert _cond(sw, 0)["operator"] == {"type": "number", "operation": "gt"}


# ---- field paths -------------------------------------------------------------

@pytest.mark.parametrize(
    "field,expr",
    [
        ("amount", "={{ $json.amount }}"),
        ("data.object.amount", "={{ $json.data.object.amount }}"),
        ("$json.body.amount", "={{ $json.body.amount }}"),
        ("items.0.price", "={{ $json.items[0].price }}"),
        ("customer name", "={{ $json['customer name'] }}"),
        ("it's", "={{ $json['it\\'s'] }}"),
        ("={{ $json.a + $json.b }}", "={{ $json.a + $json.b }}"),
    ],
)
def test_field_expression(field, expr):
    assert graph.field_expression(field) == expr


# ---- otherwise -------------------------------------------------------------

def test_otherwise_uses_fallback_output_and_no_sink():
    sw, conns, synth, report = _build(
        [ConditionBranch("high", rule=BranchRule("amount", "gt", 500)),
         ConditionBranch("rest", otherwise=True)]
    )
    rules = sw.fixed_params["rules"]["values"]
    assert [r["outputKey"] for r in rules] == ["high"]
    assert sw.fixed_params["options"] == {
        "fallbackOutput": "extra", "renameFallbackOutput": "rest"}
    assert _from(conns, sw.name) == {(0, "Do high"), (1, "Do rest")}
    assert not [n for n in synth if n.node_type.endswith("noOp")]
    assert not report.warnings


def test_otherwise_in_the_middle_keeps_rule_indexes_dense():
    sw, conns, *_ = _build(
        [ConditionBranch("a", rule=BranchRule("x", "equals", "1")),
         ConditionBranch("rest", otherwise=True),
         ConditionBranch("c", rule=BranchRule("x", "equals", "3"))]
    )
    assert [r["outputKey"] for r in sw.fixed_params["rules"]["values"]] == ["a", "c"]
    assert _from(conns, sw.name) == {(0, "Do a"), (1, "Do c"), (2, "Do rest")}


def test_otherwise_with_no_steps_leaves_fallback_unconnected():
    sw, conns, synth, _ = _build(
        [ConditionBranch("high", rule=BranchRule("amount", "gt", 500)),
         ConditionBranch("rest", otherwise=True)],
        branch_steps=["high"],
    )
    assert _from(conns, sw.name) == {(0, "Do high")}
    assert not [n for n in synth if n.node_type.endswith("noOp")]


def test_without_otherwise_the_sink_stays():
    sw, conns, synth, _ = _build(
        [ConditionBranch("a", rule=BranchRule("x", "is_true")),
         ConditionBranch("b", rule=BranchRule("x", "is_false"))]
    )
    sinks = [n for n in synth if n.node_type.endswith("noOp")]
    assert len(sinks) == 1
    assert (2, sinks[0].name) in _from(conns, sw.name)
    assert sw.fixed_params["options"]["renameFallbackOutput"] == graph.SWITCH_FALLBACK_LABEL


def test_second_otherwise_is_an_ordinary_branch_with_warning():
    sw, conns, _, report = _build(
        [ConditionBranch("a", rule=BranchRule("x", "is_true")),
         ConditionBranch("o1", otherwise=True),
         ConditionBranch("o2", otherwise=True)]
    )
    assert [r["outputKey"] for r in sw.fixed_params["rules"]["values"]] == ["a", "o2"]
    assert (2, "Do o1") in _from(conns, sw.name)
    assert any("more than one 'otherwise'" in w for w in report.warnings)


def test_ai_routed_switch_with_otherwise():
    """An agent may also have an otherwise branch: its own label is never a
    rule, so an unmatched or missing marker lands on the fallback output."""
    sw, conns, synth, _ = _build(
        [ConditionBranch("approved"), ConditionBranch("other", otherwise=True)],
        source_kind="agent_root",
    )
    assert _cond(sw, 0)["rightValue"] == "DECISION: [approved]"
    assert _from(conns, sw.name) == {(0, "Do approved"), (1, "Do other")}
    assert not [n for n in synth if n.node_type.endswith("noOp")]


# ---- loader ----------------------------------------------------------------

def _preview(trigger_condition=None, step_condition=None):
    trigger = {"type": "Webhook", "service": "", "n8n_trigger_resolved": True,
               "n8n_trigger_node": {"type": "n8n-nodes-base.webhook", "typeVersion": 2}}
    if trigger_condition is not None:
        trigger["condition"] = trigger_condition
    step = {"step": 1, "service": "gmail", "depends_on": []}
    if step_condition is not None:
        step["condition"] = step_condition
    return {"preview_json": {"trigger": trigger, "workflow": [step]}}


def test_loader_plain_label_branches_unchanged():
    steps = preview_to_steps(_preview(step_condition={"branches": ["yes", "no"]}))
    assert steps[1].condition == [ConditionBranch("yes"), ConditionBranch("no")]
    assert steps[0].condition is None


def test_loader_object_branches():
    steps = preview_to_steps(_preview(step_condition={"branches": [
        {"label": "big", "when": {"field": " amount ", "operator": "gt", "value": 500}},
        {"label": "expr", "expression": "$json.a"},
        {"label": "rest", "otherwise": True},
    ]}))
    big, expr, rest = steps[1].condition
    assert big.rule == BranchRule("amount", "gt", 500) and not big.otherwise
    assert expr.expression == "$json.a" and expr.rule is None
    assert rest.otherwise and rest.rule is None


@pytest.mark.parametrize(
    "when",
    [None, "amount > 5", {"field": "", "operator": "gt"},
     {"field": "amount", "operator": ">"}, {"operator": "gt", "value": 1}],
)
def test_loader_unusable_when_leaves_rule_empty(when):
    steps = preview_to_steps(_preview(step_condition={"branches": [
        {"label": "a", "when": when}]}))
    assert steps[1].condition[0].rule is None


def test_loader_otherwise_must_be_literally_true():
    steps = preview_to_steps(_preview(step_condition={"branches": [
        {"label": "a", "otherwise": "yes"}]}))
    assert steps[1].condition[0].otherwise is False


def test_loader_empty_branches_is_no_condition():
    steps = preview_to_steps(_preview(step_condition={"branches": []}))
    assert steps[1].condition is None


# ---- trigger-level fork (fixture) -------------------------------------------

def test_trigger_condition_routes_through_switch_after_trigger():
    p = json.loads((FIXTURES / "test_preview_trigger_rules.json").read_text("utf-8"))
    steps = preview_to_steps(p)
    trigger = steps[0]
    assert trigger.is_trigger and [b.label for b in trigger.condition] == [
        "high_value", "standard_value"]

    res = {0: _node(0, name="Webhook"), 1: _node(1, name="Sales"), 2: _node(2, name="Finance")}
    report = CompileReport()
    conns, synth = graph.build_connections(steps, res, report)
    switch = next(n for n in synth if n.node_type.endswith("switch"))
    assert switch.step == 0 and switch.layout_hint == "after_step"
    assert _cond(switch, 0)["leftValue"] == "={{ $json.body.amount }}"
    assert _from(conns, "Webhook") == {(0, switch.name)}
    assert _from(conns, switch.name) == {(0, "Sales"), (1, "Finance")}
    assert not report.warnings
