"""
tests/compiler/test_credential_issues.py

Offline tests for CompileReport.credential_issues (plan 8.6). Independent of
nodes.json, Postgres and n8n: the node-acceptance/required lookups, the
graph/layout/resolve stages and the credential resolver are all stubbed, so
only compile()'s credential handling is under test.
"""

import importlib

import pytest

from app.compiler.interfaces import CredentialResolver, PlaceholderParamProvider
from app.compiler.models import ResolvedNode, Step
from app.compiler.param_schema import _NODES_JSON_PATH

C = importlib.import_module("app.compiler.compile")  # not the re-exported function


class StubResolver(CredentialResolver):
    def __init__(self, cred):
        self.cred = cred

    def resolve(self, user_id, service, n8n_credential_type):
        return self.cred


GOOD = {"id": "c1", "name": "gmail", "type": "gmailOAuth2"}


def _action():
    return ResolvedNode(
        step=1,
        kind="action_node",
        node_type="n8n-nodes-base.gmail",
        type_version=2.2,
        n8n_credential_type="gmailOAuth2",
        name="Gmail",
    )


def _agent():
    agent = ResolvedNode(
        step=1,
        kind="agent_root",
        node_type="@n8n/n8n-nodes-langchain.agent",
        type_version=3.1,
        name="groq (AI Agent)",
    )
    agent.subnodes = [
        ResolvedNode(
            step=1,
            kind="ai_subnode",
            node_type="@n8n/n8n-nodes-langchain.lmChatGroq",
            type_version=1,
            n8n_credential_type="groqApi",
            ai_connection_type="ai_languageModel",
            name="groq (Chat Model)",
        )
    ]
    return agent


@pytest.fixture
def run(monkeypatch):
    def _run(resolved, cred, *, accepts=True, required=True):
        monkeypatch.setattr(
            C, "resolve_all_steps", lambda steps: ({1: resolved}, C.CompileReport())
        )
        monkeypatch.setattr(C, "build_connections", lambda s, r, rep: ([], []))
        monkeypatch.setattr(C, "layout_positions", lambda s, r: {})
        monkeypatch.setattr(C, "get_required_params", lambda *a, **k: [])
        monkeypatch.setattr(C, "get_structural_defaults", lambda *a, **k: {})
        monkeypatch.setattr(
            C, "auth_params_for_credential", lambda *a, **k: {} if accepts else None
        )
        if required is not None:  # None = keep the REAL credential_required
            monkeypatch.setattr(C, "credential_required", lambda *a, **k: required)
        step = Step(step=1, service="gmail", instructions="do it")
        return C.compile([step], PlaceholderParamProvider(), StubResolver(cred), "u1")

    return _run


def test_compatible_credential_is_deployable(run):
    r = run(_action(), GOOD)
    assert r.report.is_deployable and r.workflow_json is not None


def test_incompatible_blocks_and_skips_workflow(run):
    r = run(_action(), GOOD, accepts=False)
    assert not r.report.is_deployable and r.workflow_json is None
    (issue,) = r.report.credential_issues
    assert issue.problem == "incompatible" and issue.connected_type == "gmailOAuth2"
    assert r.report.needs_user_input == []  # picker list untouched
    assert any("not accepted" in w for w in r.report.warnings)  # old text kept


def test_missing_required_blocks(run):
    r = run(_action(), None, required=True)
    assert [i.problem for i in r.report.credential_issues] == ["missing"]
    assert r.workflow_json is None


def test_missing_optional_only_warns(run):
    r = run(_action(), None, required=False)
    assert r.report.is_deployable and r.report.warnings


def test_missing_on_http_only_only_warns(run):
    node = _action()
    node.kind = "http_only"
    r = run(node, None, required=True)
    assert r.report.is_deployable


def test_untyped_row_blocks_and_never_keys_credentials_by_none(run):
    r = run(_action(), {"id": "c1", "name": "x", "type": None})
    assert [i.problem for i in r.report.credential_issues] == ["untyped"]
    assert r.workflow_json is None


def test_ai_step_reports_one_issue(run):
    r = run(_agent(), None, required=True)
    assert [i.problem for i in r.report.credential_issues] == ["missing"]
    assert r.workflow_json is None


# ---- real credential_required (reads scripts/nodes.json) ------------------
# The tests above stub the required-lookup; these two keep it real, because
# the bug they guard against lived inside it: nodes whose auth defaults to
# "none" reported "credential required", so a missing credential blocked deploy.

needs_nodes_json = pytest.mark.skipif(
    not _NODES_JSON_PATH.exists(), reason="needs the real scripts/nodes.json"
)


def _graphql():
    return ResolvedNode(
        step=1,
        kind="action_node",
        node_type="n8n-nodes-base.graphql",
        type_version=1.1,
        n8n_credential_type="httpHeaderAuth",
        name="GraphQL",
    )


@needs_nodes_json
def test_no_auth_by_default_node_without_a_credential_is_not_blocked(run):
    r = run(_graphql(), None, required=None)
    assert r.report.credential_issues == []
    assert r.report.is_deployable and r.workflow_json is not None
    assert r.report.warnings  # the user is still told no credential is connected


@needs_nodes_json
def test_gmail_without_a_credential_still_blocks_with_the_real_check(run):
    r = run(_action(), None, required=None)
    assert [i.problem for i in r.report.credential_issues] == ["missing"]
    assert r.workflow_json is None
