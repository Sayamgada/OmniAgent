import json
from app.compiler.loader import preview_to_steps
from app.compiler.resolve import resolve_all_steps
from app.compiler.param_form import build_param_form
from app.compiler.compile import compile as do_compile
from app.compiler.interfaces import PlaceholderParamProvider, DummyCredentialResolver

preview_json = json.load(open("path/to/a/real/cached/preview.json"))
steps = preview_to_steps(preview_json)

resolved, report = resolve_all_steps(steps)
for s in steps:
    r = resolved[s.step]
    print(
        s.step,
        s.service,
        r.kind,
        r.node_type,
        r.type_version,
        [sn.node_type for sn in r.subnodes],
    )
assert report.is_deployable, report.needs_user_input

form = build_param_form(steps)
for f in form.forms:
    print(f.step, f.display_label, [fd.name for fd in f.fields])

result = do_compile(
    steps, PlaceholderParamProvider(), DummyCredentialResolver(), user_id="test-user"
)
assert result.workflow_json is not None
print(json.dumps(result.workflow_json, indent=2))
