"""
scripts/extract_ai_providers.py

Phase 2, step 2.1 -- READ-ONLY, writes nothing. Prints what n8n's own nodes.json
says about each candidate AI provider's chat-model node, so the provider catalog
(app/core/ai_providers.py) is built from verified facts, not memory.

For each provider (D4 scope: groq, openai, anthropic, gemini, mistral, openrouter):
  - chat-model node type, version (with the defaultVersion rule), credential type
  - the model parameter: its name, type (options / string / resourceLocator),
    default, whether the list is static or loaded at runtime, and its gating
Then it prints what generated_registry.json currently holds for the same keys.

Run from the server folder (venv active):
    python scripts/extract_ai_providers.py
    python scripts/extract_ai_providers.py path/to/nodes.json    (optional)

Paste the full output back. Output is ASCII only.
"""

import json
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
SERVER_DIR = SCRIPTS_DIR.parent
REGISTRY_PATH = SERVER_DIR / "app" / "utils" / "generated_registry.json"

# provider key (as used in the registry / catalog) -> credential type names to look for.
# Candidates only: the script reports what it actually finds, it does not trust these.
PROVIDERS = {
    "groq": ["groqApi"],
    "openai": ["openAiApi"],
    "anthropic": ["anthropicApi"],
    "gemini": ["googlePalmApi", "googleGeminiApi"],
    "mistral": ["mistralCloudApi"],
    "openrouter": ["openRouterApi"],
}

MODEL_PROP_NAMES = {"model", "modelname", "modelid", "model_name"}


def say(text=""):
    print(text.encode("ascii", "replace").decode("ascii"))


def short(value, limit=90):
    s = json.dumps(value, ensure_ascii=True) if not isinstance(value, str) else value
    return s if len(s) <= limit else s[: limit - 3] + "..."


def version_matches(entry):
    """Learnings rule: scalar -> defaultVersion == version; list -> defaultVersion in version.
    Nodes with no defaultVersion (e.g. lmChatGroq, scalar version 1) match on themselves.
    """
    version = entry.get("version")
    default = entry.get("defaultVersion")
    if default is None:
        return True
    if isinstance(version, list):
        return default in version
    return version == default


def pick_entry(entries):
    """nodes.json holds un-deduplicated legacy versions: keep the one the rule selects,
    else the highest."""
    good = [e for e in entries if version_matches(e)]
    pool = good or entries

    def top(e):
        v = e.get("version")
        return (
            max(v)
            if isinstance(v, list) and v
            else (v if isinstance(v, (int, float)) else 0)
        )

    return sorted(pool, key=top)[-1]


def cred_names(entry):
    return [
        c.get("name") for c in (entry.get("credentials") or []) if isinstance(c, dict)
    ]


def walk_properties(props, path=""):
    """Yield (path, prop) for every property, descending into collection/fixedCollection."""
    for p in props or []:
        if not isinstance(p, dict):
            continue
        here = f"{path}.{p.get('name')}" if path else str(p.get("name"))
        yield here, p
        if p.get("type") in ("collection", "fixedCollection"):
            for opt in p.get("options") or []:
                if isinstance(opt, dict):
                    if "values" in opt:  # fixedCollection group
                        yield from walk_properties(
                            opt["values"], f"{here}.{opt.get('name')}"
                        )
                    else:
                        yield from walk_properties([opt], here)


def describe_model_prop(path, p):
    lines = [f"    model param path : {path}"]
    lines.append(f"      type           : {p.get('type')}")
    lines.append(f"      displayName    : {p.get('displayName')}")
    lines.append(f"      default        : {short(p.get('default'))}")
    if p.get("required") is not None:
        lines.append(f"      required       : {p.get('required')}")
    if p.get("displayOptions"):
        lines.append(f"      displayOptions : {short(p.get('displayOptions'), 140)}")
    to = p.get("typeOptions") or {}
    if to.get("loadOptionsMethod") or to.get("loadOptions"):
        lines.append(
            f"      model list     : loaded at runtime ({short(to.get('loadOptionsMethod') or to.get('loadOptions'))})"
        )
    if p.get("type") == "options":
        opts = [o for o in (p.get("options") or []) if isinstance(o, dict)]
        if opts:
            lines.append(
                f"      static options : {len(opts)} (first 5 values: {[o.get('value') for o in opts[:5]]})"
            )
    if p.get("type") == "resourceLocator":
        modes = p.get("modes") or []
        mode_desc = []
        for m in modes:
            tag = m.get("name")
            if (m.get("typeOptions") or {}).get("searchListMethod"):
                tag += "(search)"
            mode_desc.append(tag)
        lines.append(
            f"      locator modes  : {mode_desc}   default mode: {short((p.get('default') or {}).get('mode') if isinstance(p.get('default'), dict) else None)}"
        )
    return lines


def main():
    nodes_path = Path(sys.argv[1]) if len(sys.argv) > 1 else SCRIPTS_DIR / "nodes.json"
    if not nodes_path.exists():
        say(
            f"nodes.json not found at {nodes_path} -- pass its path as the first argument"
        )
        return 1
    raw = json.load(open(nodes_path, encoding="utf-8"))
    nodes = raw if isinstance(raw, list) else raw.get("nodes", raw)

    by_name = {}
    for n in nodes:
        if isinstance(n, dict) and n.get("name"):
            by_name.setdefault(n["name"], []).append(n)

    say(
        f"nodes.json: {nodes_path}  ({len(nodes)} entries, {len(by_name)} distinct names)"
    )

    # 1. compact index of EVERY chat-model node, so providers outside D4 are visible too
    say("\n=== All chat-model nodes (name contains 'lmChat') ===")
    chat_nodes = {}
    for name, entries in sorted(by_name.items()):
        short_name = name.split(".")[-1]
        if short_name.startswith("lmChat"):
            e = pick_entry(entries)
            chat_nodes[name] = e
            say(
                f"  {name:55s} v={short(e.get('version'), 14):12s} default={short(e.get('defaultVersion'), 8):6s} creds={cred_names(e)}"
            )

    # 2. per-provider detail
    say("\n=== D4 providers ===")
    for key, cred_candidates in PROVIDERS.items():
        say(f"\n--- {key} ---")
        found = [
            (n, e)
            for n, e in chat_nodes.items()
            if set(cred_names(e)) & set(cred_candidates)
        ]
        if not found:
            say(f"  NO lmChat* node uses any of {cred_candidates}")
            # help diagnose: who uses those credentials at all?
            for name, entries in by_name.items():
                for e in entries:
                    if set(cred_names(e)) & set(cred_candidates):
                        say(f"  (credential used by: {name})")
                        break
            continue
        for name, e in found:
            say(f"  node type      : {name}")
            say(
                f"  version        : {short(e.get('version'))}   defaultVersion: {short(e.get('defaultVersion'))}"
            )
            say(f"  credential(s)  : {cred_names(e)}")
            say(
                f"  inputs/outputs : {short(e.get('inputs'), 40)} / {short(e.get('outputs'), 60)}"
            )
            hits = [
                (path, p)
                for path, p in walk_properties(e.get("properties"))
                if str(p.get("name", "")).lower() in MODEL_PROP_NAMES
                or p.get("displayName") == "Model"
            ]
            if not hits:
                # the version rule may have picked an entry without the property; look at the other versions
                for other in by_name.get(name, []):
                    if other is e:
                        continue
                    alt = [
                        (path, p)
                        for path, p in walk_properties(other.get("properties"))
                        if str(p.get("name", "")).lower() in MODEL_PROP_NAMES
                        or p.get("displayName") == "Model"
                    ]
                    if alt:
                        say(
                            f"    (model param not in the selected version; found in version {short(other.get('version'))})"
                        )
                        hits = alt
                        break
            if not hits:
                say(
                    "    no property named model/modelName/modelId and none displayed as 'Model'"
                )
                say(
                    f"    top-level property names: {[p.get('name') for p in e.get('properties') or []][:15]}"
                )
            for path, p in hits:
                for line in describe_model_prop(path, p):
                    say(line)

    # 3. what the registry holds now for the same keys
    say("\n=== generated_registry.json entries for the same keys ===")
    if not REGISTRY_PATH.exists():
        say(f"  registry not found at {REGISTRY_PATH}")
        return 0
    reg = json.load(open(REGISTRY_PATH, encoding="utf-8"))
    for key in PROVIDERS:
        entry = reg.get(key)
        if entry is None:
            say(f"  {key}: NOT A KEY in the registry")
            continue
        say(f"  {key}: kind={entry.get('kind')}  entry keys={sorted(entry.keys())}")
        say(f"      nodes = {short(entry.get('nodes'), 400)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
