"""
Evaluation harness (8.3).

Runs a fixed prompt set (scripts/eval_prompts.json) through the same path the
app uses and records, per prompt and run, how far it gets:

    generated -> clean (no COMPLIANCE MISS) -> resolved -> compiled
              -> [--n8n] created in n8n -> [--activate] activated

It mirrors agent_router.extract_workflow's GENERATION path (FAISS search for
context, then generate_groq_workflow) but deliberately:
  - never serves a cached Mongo preview (a cache hit would skip generation and
    make the numbers meaningless; best_similarity / cache_would_hit are
    recorded for information only), and
  - never calls store_generated_workflow* (that writes Mongo + FAISS).

The generator needs no changes: its checks are print()s, captured here with
contextlib.redirect_stdout and classified by prefix.

Usage (from server/):
    python scripts/eval_harness.py                       # offline stages, 1 run per prompt
    python scripts/eval_harness.py --runs 3              # numbers for the report
    python scripts/eval_harness.py --only C1,C2
    python scripts/eval_harness.py --n8n                 # also create in n8n (dummy credentials), then delete
    python scripts/eval_harness.py --n8n --activate --user-email you@example.com
    python scripts/eval_harness.py --cleanup             # delete anything left in the ledger

--activate uses YOUR real credentials, so a Gmail trigger could briefly poll
your inbox; each workflow is deactivated and deleted straight after. It asks
for confirmation unless --yes is given.
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import csv
import io
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

SCRIPTS_DIR = Path(__file__).resolve().parent
PROMPTS_PATH = SCRIPTS_DIR / "eval_prompts.json"
OUT_ROOT = SCRIPTS_DIR / "eval_out"
LEDGER_PATH = OUT_ROOT / "created_workflows.json"

# Copy of agent_router.SIMILARITY_THRESHOLD, kept here so this script does not
# import the FastAPI app. Informational only (cache is never served here).
SIMILARITY_THRESHOLD = 0.75
TOP_K = 5

# n8n_resolution_kind values the generator emits (workflow_generator.py,
# _enrich_with_real_operations). n8n_resolved is False for AI steps BY DESIGN,
# so resolution is judged by kind, not by that flag.
OK_KINDS = {"action_node", "ai_subnode", "http_only", "flat_params_node"}
PICK_KINDS = {"no_operation_match"}  # needs the user's operation pick; not a failure

DOMAIN_ORDER = ["Corporate", "Education", "Finance"]

FIELDS = [
    "run_id",
    "prompt_id",
    "domain",
    "category",
    "run",
    "expect_refuse",
    "best_similarity",
    "cache_would_hit",
    "search_error",
    "generated",
    "gen_error",
    "refused",
    "compliance_misses",
    "warnings",
    "retry",
    "final_missing_branch",
    "clean",
    "steps",
    "needs_pick",
    "bad_kinds",
    "trigger_resolved",
    "resolved",
    "compiled",
    "needs_user_input",
    "compile_warnings",
    "compile_error",
    "expectation_notes",
    "n8n_attempted",
    "n8n_created",
    "n8n_activated",
    "n8n_deleted",
    "n8n_error",
    "failed_stage",
    "seconds",
]


# --------------------------------------------------------------------------
# app wiring (imported lazily so --help / --cleanup stay cheap)
# --------------------------------------------------------------------------


def _load_app(need_resolver: bool) -> SimpleNamespace:
    from app.compiler import (
        DummyCredentialResolver,
        PlaceholderParamProvider,
        compile as compile_workflow,
    )
    from app.compiler.loader import preview_to_steps
    from app.services import n8n_client
    from app.services.vectorstore import search_automations
    from app.services.workflow_generator import (
        _collect_missing_branch_problems,
        generate_groq_workflow,
    )

    ns = SimpleNamespace(
        generate=generate_groq_workflow,
        missing_branch=_collect_missing_branch_problems,
        search=search_automations,
        preview_to_steps=preview_to_steps,
        compile=compile_workflow,
        placeholder=PlaceholderParamProvider,
        dummy_resolver=DummyCredentialResolver,
        n8n=n8n_client,
        pg_resolver=None,
    )
    if need_resolver:
        from app.compiler.credential_resolver import PostgresCredentialResolver

        ns.pg_resolver = PostgresCredentialResolver
    return ns


def _open_db():
    from app.database import get_postgres_db

    gen = get_postgres_db()
    return next(gen) if hasattr(gen, "__next__") else gen


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------


def _classify_console(text: str) -> dict:
    tagged = [
        ln.strip()
        for ln in text.splitlines()
        if ln.strip().startswith("[workflow_generator]")
    ]
    misses = [ln for ln in tagged if "COMPLIANCE MISS" in ln]
    retry_lines = [ln for ln in tagged if "retry" in ln.lower()]
    warns = [
        ln for ln in tagged if "COMPLIANCE MISS" not in ln and "retry" not in ln.lower()
    ]
    retry = "none"
    joined = " | ".join(retry_lines).lower()
    if "retrying once" in joined:
        retry = "fired"
        if "retry improved" in joined:
            retry = "improved"
        elif "retry no better" in joined:
            retry = "no_better"
        elif "retry failed" in joined:
            retry = "failed"
    return {"misses": misses, "warns": warns, "retry": retry}


def _check_expectations(expect: dict, preview_json: dict) -> list[str]:
    notes: list[str] = []
    steps = preview_json.get("workflow") or []
    trig = ((preview_json.get("trigger") or {}).get("type") or "").strip()
    any_of = expect.get("trigger_any_of")
    if any_of and trig.lower() not in [t.lower() for t in any_of]:
        notes.append(f"trigger {trig!r} not in {any_of}")
    has_fork = any(isinstance(s.get("condition"), dict) for s in steps)
    if expect.get("fork") is True and not has_fork:
        notes.append("expected a fork (condition) but none was generated")
    if expect.get("fork") is False and has_fork:
        notes.append("unexpected fork (condition) generated")
    forbid = set(expect.get("forbid_ops") or [])
    hits = [s.get("step") for s in steps if s.get("operation") in forbid]
    if hits:
        notes.append(f"forbidden operation(s) {sorted(forbid)} used in step(s) {hits}")
    req = expect.get("require_any_service")
    if req and not any(s.get("service") in req for s in steps):
        notes.append(f"expected at least one step using one of {req}")
    return notes


def _new_row(run_id: str, p: dict, k: int) -> dict:
    row = {f: "" for f in FIELDS}
    row.update(
        run_id=run_id,
        prompt_id=p["id"],
        domain=p["domain"],
        category=p.get("category", ""),
        run=k,
        expect_refuse=bool((p.get("expect") or {}).get("refuse")),
        generated=False,
        refused=False,
        clean=False,
        resolved=False,
        compiled=False,
        n8n_attempted=False,
        n8n_created=False,
        n8n_activated=False,
        n8n_deleted=False,
        compliance_misses=0,
        warnings=0,
        final_missing_branch=0,
        steps=0,
        needs_pick=0,
        needs_user_input=0,
        compile_warnings=0,
    )
    return row


def _ledger_read() -> list[dict]:
    if LEDGER_PATH.exists():
        try:
            return json.loads(LEDGER_PATH.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


def _ledger_write(items: list[dict]) -> None:
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    LEDGER_PATH.write_text(json.dumps(items, indent=2), encoding="utf-8")


def _ledger_add(wf_id: str, name: str) -> None:
    items = _ledger_read()
    items.append(
        {"id": str(wf_id), "name": name, "created_at": datetime.now().isoformat()}
    )
    _ledger_write(items)


def _ledger_remove(wf_id: str) -> None:
    _ledger_write([i for i in _ledger_read() if i.get("id") != str(wf_id)])


# --------------------------------------------------------------------------
# one prompt, one run
# --------------------------------------------------------------------------


async def run_one(app, p: dict, k: int, args, run_id: str, run_dir: Path, ctx) -> dict:
    row = _new_row(run_id, p, k)
    detail = {"console": "", "compliance": [], "warns": []}
    expect = p.get("expect") or {}
    t0 = time.time()
    wf_name = f"eval-{run_id}-{p['id']}-r{k}"

    # ---- generate (router path minus cache serving and storage) ----------
    docs: list = []
    workflow = None
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            try:
                docs = (
                    app.search(query=p["prompt"], category=p["domain"], top_k=TOP_K)
                    or []
                )
            except Exception as e:  # router would 502 here; record and carry on
                row["search_error"] = repr(e)[:200]
            context = "\n\n".join(
                f"Automation Name: {d['automation_name']}\n"
                f"Automation Description: {d['description']}"
                for d in docs
            )
            workflow = await app.generate(
                domain=p["domain"], description=p["prompt"], context=context
            )
    except Exception as e:
        row["gen_error"] = repr(e)[:300]
    detail["console"] += buf.getvalue()

    if docs:
        best = max(d.get("similarity_score", 0.0) for d in docs)
        row["best_similarity"] = round(best, 3)
        row["cache_would_hit"] = best >= SIMILARITY_THRESHOLD

    generated = isinstance(workflow, dict) and isinstance(
        workflow.get("preview_json"), dict
    )
    row["generated"] = generated

    if expect.get("refuse"):
        row["refused"] = not generated
        if generated:
            row["expectation_notes"] = "expected a refusal but a preview was generated"
        row["failed_stage"] = "" if row["refused"] else "scope"
        row["seconds"] = round(time.time() - t0, 1)
        return _finish(
            row, detail, workflow, run_dir, p, k
        )  # never compile/deploy these

    if not generated:
        row["failed_stage"] = "generate"
        row["seconds"] = round(time.time() - t0, 1)
        return _finish(row, detail, workflow, run_dir, p, k)

    pj = workflow["preview_json"]

    # ---- compliance (captured prints + structural truth on the final result)
    cls = _classify_console(detail["console"])
    row["compliance_misses"] = len(cls["misses"])
    row["warnings"] = len(cls["warns"])
    row["retry"] = cls["retry"]
    row["final_missing_branch"] = len(app.missing_branch(pj))
    row["clean"] = row["compliance_misses"] == 0 and row["final_missing_branch"] == 0
    detail["compliance"], detail["warns"] = cls["misses"], cls["warns"]

    # ---- resolution (by n8n_resolution_kind) -----------------------------
    steps_raw = pj.get("workflow") or []
    bad = [
        (s.get("step"), s.get("n8n_resolution_kind"))
        for s in steps_raw
        if s.get("n8n_resolution_kind") not in (OK_KINDS | PICK_KINDS)
    ]
    row["steps"] = len(steps_raw)
    row["needs_pick"] = sum(
        1 for s in steps_raw if s.get("n8n_resolution_kind") in PICK_KINDS
    )
    row["bad_kinds"] = "; ".join(f"{n}:{kind}" for n, kind in bad)
    row["trigger_resolved"] = bool(
        (pj.get("trigger") or {}).get("n8n_trigger_resolved")
    )
    row["resolved"] = (not bad) and row["trigger_resolved"]

    notes = _check_expectations(expect, pj)
    row["expectation_notes"] = "; ".join(notes)

    # ---- compile with placeholder params + dummy credentials -------------
    steps = None
    result = None
    cbuf = io.StringIO()
    try:
        with contextlib.redirect_stdout(cbuf):
            steps = app.preview_to_steps(workflow)
            result = app.compile(
                steps,
                app.placeholder(),
                app.dummy_resolver(),
                user_id="eval-user",
                workflow_name=wf_name,
            )
        row["compiled"] = bool(result.report.is_deployable)
        row["needs_user_input"] = len(result.report.needs_user_input)
        row["compile_warnings"] = len(result.report.warnings)
    except Exception as e:
        row["compile_error"] = repr(e)[:300]
    detail["console"] += cbuf.getvalue()

    # ---- optional n8n stages ---------------------------------------------
    if args.n8n and result is not None and row["compiled"]:
        await _n8n_stages(app, row, steps, result, wf_name, args, ctx)

    # ---- first hard failure ----------------------------------------------
    if not row["resolved"]:
        row["failed_stage"] = "resolve"
    elif not row["compiled"]:
        row["failed_stage"] = "compile"
    elif row["n8n_attempted"] and not row["n8n_created"]:
        row["failed_stage"] = "n8n_create"
    elif args.activate and row["n8n_created"] and not row["n8n_activated"]:
        row["failed_stage"] = "n8n_activate"
    row["seconds"] = round(time.time() - t0, 1)
    return _finish(row, detail, workflow, run_dir, p, k)


async def _n8n_stages(app, row, steps, result, wf_name, args, ctx) -> None:
    wf_json = result.workflow_json
    if args.activate:
        try:
            real = app.compile(
                steps,
                app.placeholder(),
                app.pg_resolver(ctx["db"]),
                user_id=str(ctx["user"].id),
                workflow_name=wf_name,
            )
        except Exception as e:
            row["n8n_error"] = f"real-credential compile failed: {e!r}"[:300]
            return
        if not real.report.is_deployable:
            row["n8n_error"] = "not deployable with real credentials"
            return
        wf_json = real.workflow_json

    row["n8n_attempted"] = True
    wf_id = None
    activated = False
    try:
        created = await app.n8n.create_workflow(wf_json)
        wf_id = created["id"]
        _ledger_add(wf_id, wf_name)
        row["n8n_created"] = True
        if args.activate:
            try:
                await app.n8n.activate_workflow(wf_id)
                activated = True
                row["n8n_activated"] = True
            except Exception as e:
                row["n8n_error"] = f"activate: {e}"[:300]
    except Exception as e:
        row["n8n_error"] = f"create: {e}"[:300]
    finally:
        if wf_id is not None:
            try:
                if activated:
                    await app.n8n.deactivate_workflow(wf_id)
                await app.n8n.delete_workflow(wf_id)
                row["n8n_deleted"] = True
                _ledger_remove(wf_id)
            except Exception as e:
                row["n8n_error"] = (
                    (row["n8n_error"] + " | " if row["n8n_error"] else "")
                    + f"cleanup failed (see ledger): {e}"
                )[:300]


def _finish(row, detail, workflow, run_dir: Path, p: dict, k: int):
    if isinstance(workflow, dict):
        pdir = run_dir / "previews"
        pdir.mkdir(parents=True, exist_ok=True)
        (pdir / f"{p['id']}_r{k}.json").write_text(
            json.dumps(workflow, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    row["_detail"] = detail
    return row


# --------------------------------------------------------------------------
# reporting
# --------------------------------------------------------------------------


def _pct(n: int, d: int) -> str:
    return "-" if d == 0 else f"{n / d:.0%} ({n}/{d})"


def summarize(rows: list[dict], args) -> str:
    scored = [r for r in rows if not r["expect_refuse"]]
    lines = ["# Evaluation summary", ""]
    lines.append(
        f"Runs: {len(rows)} ({len({r['prompt_id'] for r in rows})} prompts). "
        "'Clean' = generated with no COMPLIANCE MISS and no unresolved missing "
        "branch. 'Compiled' = deployable with placeholder params and dummy "
        "credentials; steps needing an operation pick count as not compiled "
        "(see 'Needs pick')."
    )
    lines.append("")
    head = ["Domain", "Generated", "Clean", "Resolved", "Compiled", "Needs pick"]
    if args.n8n:
        head += ["n8n created"]
    if args.activate:
        head += ["Activated"]
    head += ["Expectations met"]
    lines.append("| " + " | ".join(head) + " |")
    lines.append("|" + "---|" * len(head))

    def line(label: str, rs: list[dict]) -> str:
        n = len(rs)
        cells = [
            label,
            _pct(sum(r["generated"] for r in rs), n),
            _pct(sum(r["clean"] for r in rs), n),
            _pct(sum(r["resolved"] for r in rs), n),
            _pct(sum(r["compiled"] for r in rs), n),
            _pct(
                sum(1 for r in rs if (not r["compiled"]) and r["needs_user_input"] > 0),
                n,
            ),
        ]
        if args.n8n:
            att = [r for r in rs if r["n8n_attempted"]]
            cells.append(_pct(sum(r["n8n_created"] for r in att), len(att)))
        if args.activate:
            att = [r for r in rs if r["n8n_created"]]
            cells.append(_pct(sum(r["n8n_activated"] for r in att), len(att)))
        gen = [r for r in rs if r["generated"]]
        cells.append(_pct(sum(1 for r in gen if not r["expectation_notes"]), len(gen)))
        return "| " + " | ".join(cells) + " |"

    for d in DOMAIN_ORDER:
        rs = [r for r in scored if r["domain"] == d]
        if rs:
            lines.append(line(d, rs))
    lines.append(line("**All**", scored))

    scope = [r for r in rows if r["expect_refuse"]]
    if scope:
        lines += [
            "",
            "## Scope control (out-of-scope prompts that must be refused)",
            "",
        ]
        for r in scope:
            verdict = (
                "refused" if r["refused"] else "NOT refused (a preview was generated)"
            )
            lines.append(f"- {r['prompt_id']} run {r['run']}: {verdict}")

    misses = [r for r in scored if r["compliance_misses"] or r["final_missing_branch"]]
    retried = [r for r in scored if r["retry"] not in ("", "none")]
    lines += [
        "",
        f"Compliance: {len(misses)} run(s) with a COMPLIANCE MISS or an unresolved "
        f"missing branch; the corrective retry fired in {len(retried)} run(s).",
    ]
    return "\n".join(lines) + "\n"


def write_outputs(rows: list[dict], run_dir: Path, args) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    with (run_dir / "results.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    summary = summarize(rows, args)
    (run_dir / "summary.md").write_text(summary, encoding="utf-8")

    blocks = []
    for r in rows:
        problem = (
            r["failed_stage"]
            or r["gen_error"]
            or r["expectation_notes"]
            or r["compliance_misses"]
            or r["final_missing_branch"]
            or r["n8n_error"]
        )
        if not problem:
            continue
        d = r.get("_detail", {})
        blocks.append(
            f"=== {r['prompt_id']} run {r['run']} ({r['domain']}) "
            f"stage={r['failed_stage'] or '-'} ===\n"
            f"gen_error: {r['gen_error']}\n"
            f"expectations: {r['expectation_notes']}\n"
            f"bad_kinds: {r['bad_kinds']}  needs_user_input: {r['needs_user_input']}  "
            f"compile_error: {r['compile_error']}\n"
            f"n8n_error: {r['n8n_error']}\n"
            f"compliance:\n  " + "\n  ".join(d.get("compliance", []) or ["-"]) + "\n"
            f"warnings:\n  " + "\n  ".join(d.get("warns", []) or ["-"]) + "\n"
        )
    (run_dir / "failures.log").write_text(
        "\n".join(blocks) if blocks else "No failures recorded.\n", encoding="utf-8"
    )
    print(summary)
    print(f"Wrote {run_dir}/results.csv, summary.md, failures.log, previews/")


# --------------------------------------------------------------------------
# driver
# --------------------------------------------------------------------------


async def cleanup(app) -> None:
    items = _ledger_read()
    if not items:
        print("Ledger is empty; nothing to clean up.")
        return
    for it in items:
        try:
            try:
                await app.n8n.deactivate_workflow(it["id"])
            except Exception:
                pass  # likely already inactive
            await app.n8n.delete_workflow(it["id"])
            _ledger_remove(it["id"])
            print(f"deleted {it['id']} ({it['name']})")
        except Exception as e:
            print(f"could not delete {it['id']} ({it['name']}): {e}")


async def run_all(args) -> list[dict]:
    app = _load_app(need_resolver=args.activate)
    prompts = json.loads(Path(args.prompts).read_text(encoding="utf-8"))
    if args.only:
        wanted = {x.strip() for x in args.only.split(",") if x.strip()}
        prompts = [p for p in prompts if p["id"] in wanted]
    if not prompts:
        raise SystemExit("No prompts selected.")

    ctx = {}
    if args.activate:
        db = _open_db()
        from app.models.user import User

        user = db.query(User).filter(User.email == args.user_email).first()
        if user is None:
            raise SystemExit(f"No user with email {args.user_email!r}")
        ctx = {"db": db, "user": user}

    run_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = OUT_ROOT / run_id
    rows: list[dict] = []
    total = len(prompts) * args.runs
    n = 0
    for p in prompts:
        for k in range(1, args.runs + 1):
            n += 1
            print(f"[{n}/{total}] {p['id']} run {k} ...", flush=True)
            row = await run_one(app, p, k, args, run_id, run_dir, ctx)
            print(
                f"    generated={row['generated']} clean={row['clean']} "
                f"resolved={row['resolved']} compiled={row['compiled']} "
                f"stage={row['failed_stage'] or '-'}",
                flush=True,
            )
            rows.append(row)
            if args.delay and n < total:
                await asyncio.sleep(args.delay)
    write_outputs(rows, run_dir, args)
    return rows


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="OmniAgent evaluation harness (8.3)")
    ap.add_argument("--prompts", default=str(PROMPTS_PATH))
    ap.add_argument("--only", help="comma-separated prompt ids, e.g. C1,C2")
    ap.add_argument("--runs", type=int, default=1, help="runs per prompt")
    ap.add_argument("--delay", type=float, default=2.0, help="seconds between runs")
    ap.add_argument(
        "--n8n", action="store_true", help="also create (then delete) in n8n"
    )
    ap.add_argument(
        "--activate",
        action="store_true",
        help="also activate (implies --n8n; real credentials)",
    )
    ap.add_argument(
        "--user-email",
        help="OmniAgent user whose connected credentials to use with --activate",
    )
    ap.add_argument(
        "--yes", action="store_true", help="skip the --activate confirmation"
    )
    ap.add_argument(
        "--cleanup",
        action="store_true",
        help="delete workflows left in the ledger, then exit",
    )
    args = ap.parse_args(argv)
    if args.activate:
        args.n8n = True
        if not args.user_email:
            ap.error("--activate requires --user-email")
    return args


def main() -> None:
    args = parse_args()
    if args.cleanup:
        asyncio.run(cleanup(_load_app(need_resolver=False)))
        return
    if args.activate and not args.yes:
        ans = input(
            "--activate uses your REAL credentials: a Gmail trigger may briefly "
            "poll your inbox before each workflow is deactivated and deleted. "
            "Continue? [y/N] "
        )
        if ans.strip().lower() != "y":
            raise SystemExit("Aborted.")
    asyncio.run(run_all(args))


if __name__ == "__main__":
    main()
