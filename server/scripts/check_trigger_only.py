import json, urllib.request

reg = json.load(open(r"server/app/utils/generated_registry.json", encoding="utf-8"))
raw = json.load(urllib.request.urlopen("http://localhost:5678/types/nodes.json"))
nodes = raw if isinstance(raw, list) else list(raw.values())
names = {n["name"] for n in nodes if isinstance(n, dict) and "name" in n}

for key, v in reg.items():
    if isinstance(v, dict) and v.get("kind") == "trigger_only":
        t = v["nodes"]["trigger"]["type"]
        base = t[:-7] if t.endswith("Trigger") else t
        status = (
            "HAS ACTION NODE (misclassified)"
            if base in names
            else "genuinely trigger-only"
        )
        print(f"{key:24} {t:55} {status}")
