r"""
scripts/check_param_overrides.py

Empirical check for build_param_form(steps, overrides) -- no server, no auth.
Run from server\ :

  python scripts\check_param_overrides.py tests\fixtures\<preview>.json
  python scripts\check_param_overrides.py <preview>.json --force-ambiguous 1
  python scripts\check_param_overrides.py <preview>.json --force-ambiguous 1 --override 1:getAll:message
  ... --out result.json     (UTF-8; avoid PowerShell 5's `>`)

--force-ambiguous STEP  marks that step no_operation_match (simulates the
                        picker case) before building the form.
--override STEP:OPERATION[:TARGET]   same data the picker would send.

Prints the exact JSON the param-schema endpoint would return -- including
unresolved_steps[].candidates, whose real shape the picker UI is built from.
"""

import argparse
import dataclasses
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.compiler import build_param_form  # noqa: E402
from app.compiler.loader import preview_to_steps  # noqa: E402
from app.compiler.models import StepOverride  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("fixture")
    ap.add_argument("--force-ambiguous", type=int, action="append", default=[])
    ap.add_argument("--override", action="append", default=[])
    ap.add_argument("--out")
    args = ap.parse_args()

    preview = json.loads(Path(args.fixture).read_text(encoding="utf-8-sig"))
    steps = preview_to_steps(preview)

    for s in steps:
        if s.step in args.force_ambiguous:
            s.n8n_resolution_kind = "no_operation_match"
            s.n8n_operation = None

    overrides = {}
    for spec in args.override:
        parts = spec.split(":")
        overrides[int(parts[0])] = StepOverride(
            operation=parts[1] if len(parts) > 1 and parts[1] else None,
            target=parts[2] if len(parts) > 2 and parts[2] else None,
        )

    result = build_param_form(steps, overrides or None)
    text = json.dumps(dataclasses.asdict(result), indent=2, default=str)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print(f"wrote {args.out}")
    else:
        print(text)
    print(
        f"\nis_ready={result.is_ready} unresolved={len(result.unresolved_steps)} "
        f"forms={len(result.forms)}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
