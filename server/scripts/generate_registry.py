"""
generate_registry.py

Builds app/utils/generated_registry.json DIRECTLY from n8n's own live
/types/nodes.json and /types/credentials.json -- no hand-maintained
service/credential mapping file. Re-run whenever those two files are
re-fetched from the running n8n instance.

CORE DESIGN DECISIONS (grounded in inspecting the real 988 nodes / 518
credential types, not assumed):

1. JOIN DIRECTION: node -> credential, not credential -> node.
   Each node's own `credentials` array (with `required` and
   `displayOptions`) is the authoritative source of which credential
   type(s) it accepts and under what condition. credentials.json's
   `supportedNodes` is NOT used as the join -- confirmed incomplete:
   many real, node-less services (Datadog, Qualys, Kibana, ...) have
   an empty supportedNodes array despite being real connectable
   services (they're used via the HTTP Request node's "Predefined
   Credential Type" picker, not a dedicated node).

2. SERVICE KEY = a node's PRIMARY credential type, snake_cased.
   Nodes that share the same primary credential type collapse into
   ONE connectable service. This one rule reproduces exactly the
   distinction we want without a hand override list:
     - AWS: ~14 product nodes (Cognito, DynamoDB, ELB, IAM, ...) each
       have `aws` as their ONLY credential -> all collapse to one
       "aws" service, each node kept as an addressable sub-entry for
       the compiler.
     - Google: Gmail, Drive, Calendar, Sheets each have their OWN
       dedicated OAuth2 credential type (gmailOAuth2, etc.) as PRIMARY
       -- googleApi (service-account) only ever appears as a SECONDARY
       option on these nodes, so they never collapse into one service.
   "Primary" for a multi-credential node is resolved via the node's
   own `authentication`-style selector property default value, else
   the first `required: true` entry, else the first entry.

3. Credential types never used as any node's primary/secondary
   (confirmed via real usage, not supportedNodes) AND not genericAuth
   AND not an abstract base -> "http_only" services: real, connectable,
   no dedicated node (Datadog, Qualys, ...).

4. Abstract/generic base types (genericAuth=true, OR referenced in
   another credential's `extends` AND never used directly by any real
   node) are excluded from the connectable-service catalog entirely.
   Kept in a separate `_generic_auth_types` section (only relevant to
   the HTTP Request / GraphQL node's own "Generic Credential Type"
   picker, not to any specific service).

5. The 6 nodes with NO n8n Credential concept at all but a raw
   auth-like node PARAMETER (crypto's `secret`, hackerNews's
   `username`, readPDF's `password`, the LangChain HTTP tool's
   genericAuthType) are flagged separately (`_inline_auth_params`) --
   they don't fit the Credential-based auth_options schema and should
   not be force-fit into it; the compiler's parameter-collection stage
   handles them as ordinary node parameters instead.

OUTPUT SHAPE (per service key):
{
  "service": "gmail",
  "display_name": "Gmail",
  "category": "Communication",
  "default_option": "oauth2",
  "auth_options": [
    {
      "option_id": "oauth2", "label": "Gmail OAuth2 API",
      "n8n_credential_type": "gmailOAuth2", "connection_pattern": 2,
      "auth_type": "oauth2", "fields": [...], "oauth": {...}
    },
    {
      "option_id": "service_account", "label": "Google Service Account",
      "n8n_credential_type": "googleApi", "connection_pattern": 1,
      "auth_type": "api_key", "fields": [...], "oauth": None
    }
  ],
  "kind": "action_node",
  "nodes": {
    "standalone": {"type": "n8n-nodes-base.gmail", "typeVersion": ..., "resources": {...}, "operationsByResource": {...}},
    "tool": {"type": "n8n-nodes-base.gmailTool", "typeVersion": ...},
    "trigger": {"type": "n8n-nodes-base.gmailTrigger", "typeVersion": ...}
  }
}

For collapsed-hub services (aws), "nodes" instead has a "families" dict
keyed by each individual node's own short name, same per-node shape as
above -- the compiler picks the right family by matching the step's
intent; the auth layer only ever sees the one "aws" service.
"""

import json
import re
import sys
from pathlib import Path

IN_DIR = Path(__file__).resolve().parent
NODES_PATH = IN_DIR / "nodes.json"
CREDS_PATH = IN_DIR / "credentials.json"
OUT_PATH = IN_DIR / "generated_registry.json"
REPORT_PATH = IN_DIR / "generation_report.json"

# ---------------------------------------------------------------- loading


def _version_num(v):
    if isinstance(v, list):
        return max(v) if v else 0
    return v or 0


def load():
    with open(NODES_PATH, encoding="utf-8") as f:
        raw_nodes = json.load(f)
    with open(CREDS_PATH, encoding="utf-8") as f:
        creds = json.load(f)

    # MCP-registry nodes are a separate subsystem (MCP OAuth, pattern 3) --
    # out of scope for this registry, same convention as the existing
    # catalog's mcp_catalog.py split. Excluded here so their credential
    # types (e.g. notionMcpOAuth2Api) never collide with the real node's
    # own service key.
    raw_nodes = [n for n in raw_nodes if not n["name"].startswith("@n8n/mcp-registry.")]

    # nodes.json is NOT pre-deduplicated by version -- the same node `name`
    # can appear multiple times, once per legacy version, each with its own
    # (sometimes DIFFERENT) credentials/properties (confirmed: twitter v1
    # has only twitterOAuth1Api, v2 has only twitterOAuth2Api). Keep only
    # the highest-version entry per name -- that's what a running n8n
    # instance actually offers by default.
    by_name = {}
    for n in raw_nodes:
        existing = by_name.get(n["name"])
        if existing is None or _version_num(n.get("version")) > _version_num(
            existing.get("version")
        ):
            by_name[n["name"]] = n
    nodes = list(by_name.values())

    return nodes, creds


# ---------------------------------------------------------- credential helpers


def index_creds(creds):
    return {c["name"]: c for c in creds}


def resolve_effective_properties(cred_name, creds_by_name, _cache=None):
    """Walk `extends` chain, merge parent properties under child (child wins
    on name collision). Returns the flat, effective property list."""
    if _cache is None:
        _cache = {}
    if cred_name in _cache:
        return _cache[cred_name]
    cred = creds_by_name.get(cred_name)
    if not cred:
        return []
    merged = {}
    for parent in cred.get("extends") or []:
        for p in resolve_effective_properties(parent, creds_by_name, _cache):
            merged[p["name"]] = p
    for p in cred.get("properties") or []:
        merged[p["name"]] = p
    result = list(merged.values())
    _cache[cred_name] = result
    return result


OAUTH_HIDDEN_NAMES = {
    "authUrl",
    "accessTokenUrl",
    "scope",
    "grantType",
    "authQueryParameters",
    "authentication",
}


def classify_connection_pattern(effective_props):
    """1=text fields, 2=pure oauth2, 4=oauth2+visible extras."""
    hidden_oauth = [p for p in effective_props if p.get("name") in OAUTH_HIDDEN_NAMES]
    visible = [
        p
        for p in effective_props
        if p.get("type") != "hidden"
        and p.get("name") not in ("allowedHttpRequestDomains", "allowedDomains")
    ]
    if not hidden_oauth:
        return 1
    return 4 if visible else 2


def snake_case(camel_name):
    """CamelCase identifier -> snake_case. Expects an identifier (credential
    `name` or node short `name`), NOT a human displayName (which has spaces
    and punctuation and needs no case conversion at all)."""
    name = re.sub(r"(OAuth2Api|OAuth2|OAuth1Api|Api)$", "", camel_name)
    s1 = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    s2 = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1)
    return s2.lower().strip("_") or camel_name.lower()


TRIGGER_TOOL_SUFFIX = re.compile(r"(HitlTool|AndWaitForResponseTool|Trigger|Tool)$")


def base_product_name(node_short_name):
    """Strip Trigger/Tool/HITL-variant suffixes to get the underlying
    product identity, e.g. 'gmailTrigger' -> 'gmail', 'gmailHitlTool' ->
    'gmail'. Repeats until stable in case of stacked suffixes."""
    prev = None
    name = node_short_name
    while name != prev:
        prev = name
        name = TRIGGER_TOOL_SUFFIX.sub("", name)
    return name


def same_product_family(base_names):
    """True if every base name in the set is the same product once variant
    suffixes are stripped, allowing for one being a prefix of another
    (handles odd variants a suffix strip alone doesn't catch)."""
    names = sorted(base_names, key=len)
    root = names[0]
    return all(n == root or n.startswith(root) or root.startswith(n) for n in names)


def slugify_label(display_name, fallback_identifier):
    """Human displayName ('AWS (Assume Role)') -> a clean option_id
    ('aws_assume_role'). Falls back to the camelCase credential identifier
    if there's no usable displayName."""
    src = display_name or fallback_identifier
    s = re.sub(r"[^a-zA-Z0-9]+", "_", src).strip("_").lower()
    return s or snake_case(fallback_identifier)


CATEGORY_KEYWORDS = [
    (
        "AI",
        [
            "openai",
            "anthropic",
            "cohere",
            "huggingface",
            "langchain",
            "gemini",
            "mistral",
            "groq",
            "ollama",
            "qdrant",
            "pinecone",
            "weaviate",
            "milvus",
        ],
    ),
    (
        "Communication",
        [
            "gmail",
            "outlook",
            "slack",
            "teams",
            "discord",
            "telegram",
            "twilio",
            "whatsapp",
            "smtp",
            "imap",
            "mail",
        ],
    ),
    (
        "Productivity",
        [
            "calendar",
            "notion",
            "trello",
            "asana",
            "clickup",
            "monday",
            "todoist",
            "airtable",
        ],
    ),
    (
        "Data & Storage",
        [
            "drive",
            "dropbox",
            "onedrive",
            "box",
            "s3",
            "ftp",
            "postgres",
            "mysql",
            "mongo",
            "redis",
            "sqlite",
            "supabase",
            "firebase",
            "database",
        ],
    ),
    ("Documents", ["sheets", "docs", "excel", "word", "confluence", "gitbook"]),
    (
        "Development",
        [
            "github",
            "gitlab",
            "bitbucket",
            "jira",
            "jenkins",
            "azure_devops",
            "docker",
            "aws",
            "azure",
            "gcp",
            "kubernetes",
        ],
    ),
    ("Sales", ["salesforce", "hubspot", "zoho", "pipedrive", "crm"]),
    ("Finance", ["stripe", "razorpay", "paypal", "quickbooks", "xero"]),
    (
        "Social Media",
        [
            "twitter",
            "linkedin",
            "facebook",
            "instagram",
            "youtube",
            "reddit",
            "pinterest",
        ],
    ),
    ("Forms", ["typeform", "jotform", "tally", "formstack", "form"]),
    ("Marketing", ["mailchimp", "activecampaign", "ghost", "campaign"]),
    (
        "Security",
        [
            "datadog",
            "crowdstrike",
            "qualys",
            "kibana",
            "sysdig",
            "cisco",
            "fortigate",
            "dynatrace",
        ],
    ),
]


def guess_category(key, display_name):
    hay = (key + " " + (display_name or "")).lower()
    for cat, kws in CATEGORY_KEYWORDS:
        if any(kw in hay for kw in kws):
            return cat
    return "Other"


def _stringify_default(value):
    """Frontend forms historically assume every field default is a string
    (calling .trim() on it, etc.) -- normalize here rather than push that
    assumption onto every consumer. None -> empty string; bool -> "true"/
    "false"; number -> its string form; dict/list (e.g. the MCP node's
    fixedCollection default) left as-is, since those were never string-like
    to begin with and need structured handling on the frontend regardless."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return value


def build_fields(effective_props):
    out = []
    for p in effective_props:
        if p.get("type") in ("hidden", "notice"):
            # "notice" fields are informational text n8n renders in its own
            # UI (a docs link, a scopes reminder) -- they carry no user input
            # and should never be part of a submittable form.
            continue
        if p.get("name") in ("allowedHttpRequestDomains", "allowedDomains"):
            continue
        out.append(
            {
                "name": p.get("name"),
                "display_name": p.get("displayName"),
                "type": p.get("type"),
                "secret": bool((p.get("typeOptions") or {}).get("password"))
                or p.get("name")
                in ("password", "secret", "apiKey", "clientSecret", "accessToken"),
                "default": _stringify_default(p.get("default")),
            }
        )
    return out


def build_oauth_block(effective_props):
    block = {}
    for p in effective_props:
        if p.get("name") in OAUTH_HIDDEN_NAMES:
            block[p["name"]] = p.get("default")
    return block or None


# ---------------------------------------------------------------- node helpers


def node_short_key(node_name):
    # "n8n-nodes-base.awsDynamoDb" -> "awsDynamoDb"; strip package prefix only
    return node_name.split(".")[-1]


def is_trigger(node):
    return "trigger" in (node.get("group") or [])


def resolve_primary_credential(node):
    """Returns the credential name this node treats as PRIMARY, or None."""
    creds = node.get("credentials") or []
    if not creds:
        return None
    if len(creds) == 1:
        return creds[0]["name"]

    # find the node's own selector property (usually named "authentication")
    # driving these credentials' displayOptions.show
    show_keys = set()
    for c in creds:
        show = (c.get("displayOptions") or {}).get("show") or {}
        show_keys.update(show.keys())

    default_val = None
    for prop in node.get("properties") or []:
        if prop.get("name") in show_keys:
            default_val = prop.get("default")
            break

    if default_val is not None:
        for c in creds:
            show = (c.get("displayOptions") or {}).get("show") or {}
            for k in show_keys:
                if k in show and default_val in show[k]:
                    return c["name"]

    required = [c for c in creds if c.get("required")]
    if required:
        return required[0]["name"]
    return creds[0]["name"]


def all_credential_names_on_node(node):
    return [c["name"] for c in (node.get("credentials") or [])]


AUTH_LIKE_PARAM = re.compile(
    r"(password|apikey|api_key|token|secret|username|accesskey)", re.I
)


def inline_auth_params(node):
    hits = []
    for p in node.get("properties") or []:
        n = p.get("name") or ""
        d = p.get("displayName") or ""
        if AUTH_LIKE_PARAM.search(n) or AUTH_LIKE_PARAM.search(d):
            hits.append(n)
    return hits


# ---------------------------------------------------------------- node classification (kind)


def classify_node_kind(node):
    props = node.get("properties") or []
    has_resource_op = any(p.get("name") == "resource" for p in props) and any(
        p.get("name") == "operation" for p in props
    )
    has_action_only = any(p.get("name") == "operation" for p in props) or any(
        p.get("name") == "action" for p in props
    )
    if (
        node["name"].startswith("@n8n/n8n-nodes-langchain.")
        and not has_resource_op
        and not has_action_only
    ):
        return "ai_subnode"
    if is_trigger(node) and not any(
        g in (node.get("group") or []) for g in ("input", "output", "transform")
    ):
        return "trigger_only"
    if has_resource_op or has_action_only:
        return "action_node"
    if props:
        return "flat_params_node"
    return "trigger_only" if is_trigger(node) else "flat_params_node"


def extract_resources_and_ops(node):
    props = node.get("properties") or []
    resources = {}
    ops_by_resource = {}
    ops_no_resource = []

    resource_prop = next((p for p in props if p.get("name") == "resource"), None)
    if resource_prop:
        for opt in resource_prop.get("options") or []:
            if opt.get("value") == "__CUSTOM_API_CALL__":
                continue
            resources[opt["value"]] = opt["name"]

    op_props = [p for p in props if p.get("name") in ("operation", "action")]
    for op_prop in op_props:
        show = (op_prop.get("displayOptions") or {}).get("show") or {}
        res_vals = show.get("resource")
        ops = []
        for opt in op_prop.get("options") or []:
            if opt.get("value") == "__CUSTOM_API_CALL__":
                continue
            ops.append(
                {
                    "label": opt.get("name"),
                    "value": opt.get("value"),
                    "action": opt.get("action"),
                }
            )
        if res_vals:
            for rv in res_vals:
                ops_by_resource.setdefault(rv, []).extend(ops)
        else:
            ops_no_resource.extend(ops)

    return resources, ops_by_resource, ops_no_resource


def node_entry(node):
    resources, ops_by_resource, ops_no_resource = extract_resources_and_ops(node)
    entry = {"type": node["name"], "typeVersion": node.get("version")}
    if isinstance(entry["typeVersion"], list):
        entry["typeVersion"] = entry["typeVersion"][-1]
    if resources:
        entry["resources"] = resources
        entry["operationsByResource"] = ops_by_resource
    elif ops_no_resource:
        entry["operationsNoResource"] = ops_no_resource
    return entry


# ---------------------------------------------------------------- main build


def main():
    nodes, creds = load()
    creds_by_name = index_creds(creds)
    report = {"warnings": [], "stats": {}}

    # 1. abstract / generic classification
    genericAuth_names = {c["name"] for c in creds if c.get("genericAuth")}
    extended_names = set()
    for c in creds:
        for e in c.get("extends") or []:
            extended_names.add(e)

    # 2. real usage: which credential names does ANY node actually reference
    used_by_nodes = set()
    for n in nodes:
        used_by_nodes.update(all_credential_names_on_node(n))

    abstract_names = set()
    for c in creds:
        nm = c["name"]
        if nm in genericAuth_names:
            abstract_names.add(nm)
        elif nm in extended_names and nm not in used_by_nodes:
            abstract_names.add(nm)

    # 3. group nodes by primary credential
    groups = {}  # primary_cred_name -> list of nodes
    inline_only_nodes = []  # nodes w/ no credentials but auth-like param
    credential_free_nodes = []

    for n in nodes:
        creds_on_node = n.get("credentials") or []
        if not creds_on_node:
            hits = inline_auth_params(n)
            if hits:
                inline_only_nodes.append((n["name"], hits))
            else:
                credential_free_nodes.append(n["name"])
            continue
        primary = resolve_primary_credential(n)
        if primary in abstract_names:
            # fall back to a non-abstract credential on this node if any
            alt = next(
                (c["name"] for c in creds_on_node if c["name"] not in abstract_names),
                None,
            )
            if alt is None:
                # every credential option on this node is abstract/generic
                # (e.g. Form Trigger's Basic-Auth/Header-Auth protection) --
                # that's a node-level security setting, not a connectable
                # "service" in OmniAgent's sense. Excluded, not force-keyed
                # under a fake generic-auth hub.
                report["warnings"].append(
                    f"Node '{n['name']}' only offers generic/abstract credentials "
                    f"({[c['name'] for c in creds_on_node]}) -- excluded from service catalog"
                )
                continue
            primary = alt
        groups.setdefault(primary, []).append(n)

    # 4. build service entries from groups
    registry = {}
    cred_cache = {}

    for primary_cred, group_nodes in groups.items():
        cred = creds_by_name.get(primary_cred)
        if not cred:
            report["warnings"].append(
                f"Primary credential '{primary_cred}' referenced by a node but missing from credentials.json"
            )
            continue

        # is this a true multi-product hub, or just action+trigger+tool
        # variants of ONE product sharing a credential? Compare base
        # product names (Trigger/Tool suffix stripped) across the group.
        base_names = {base_product_name(node_short_key(n["name"])) for n in group_nodes}
        is_true_hub = not same_product_family(base_names)

        if is_true_hub:
            service_key = snake_case(primary_cred)
        else:
            # normal case: key off the product's own short node name, e.g.
            # "gmail" (from n8n-nodes-base.gmail / gmailTrigger / gmailTool)
            service_key = snake_case(sorted(base_names)[0])
        display_name = cred.get("displayName") or service_key.replace("_", " ").title()

        # secondary credentials actually used by these nodes (excluding primary, excluding abstract)
        secondary_names = set()
        for n in group_nodes:
            for cn in all_credential_names_on_node(n):
                if cn != primary_cred and cn not in abstract_names:
                    secondary_names.add(cn)

        auth_options = []
        for i, cn in enumerate([primary_cred] + sorted(secondary_names)):
            c = creds_by_name.get(cn)
            if not c:
                continue
            eff = resolve_effective_properties(cn, creds_by_name, cred_cache)
            pattern = classify_connection_pattern(eff)
            auth_options.append(
                {
                    "option_id": (
                        "primary" if i == 0 else slugify_label(c.get("displayName"), cn)
                    ),
                    "label": c.get("displayName") or cn,
                    "n8n_credential_type": cn,
                    "connection_pattern": pattern,
                    "auth_type": {1: "api_key", 2: "oauth2", 4: "oauth2_extra"}[
                        pattern
                    ],
                    "fields": build_fields(eff),
                    "oauth": build_oauth_block(eff) if pattern in (2, 4) else None,
                }
            )

        default_option = next(
            (o["option_id"] for o in auth_options if o["connection_pattern"] == 1),
            auth_options[0]["option_id"],
        )

        # nodes section
        if not is_true_hub:
            # one product: slot each node into standalone/trigger/tool by
            # its own suffix and classification, not by group size
            nodes_section = {}
            kind_out = "action_node"
            for n in group_nodes:
                short = node_short_key(n["name"])
                k = classify_node_kind(n)
                if short.endswith("Tool"):
                    nodes_section["tool"] = node_entry(n)
                elif short.endswith("Trigger") or k == "trigger_only":
                    nodes_section["trigger"] = node_entry(n)
                else:
                    nodes_section["standalone"] = node_entry(n)
                    kind_out = k
            if "standalone" not in nodes_section:
                kind_out = "trigger_only" if "trigger" in nodes_section else kind_out
        else:
            # true multi-product hub (e.g. aws) -- keep each product
            # individually addressable under one connectable service
            families = {}
            for n in group_nodes:
                k = classify_node_kind(n)
                families[node_short_key(n["name"])] = {**node_entry(n), "kind": k}
            nodes_section = {"families": families}
            kind_out = "multi_node_hub"

        registry[service_key] = {
            "service": service_key,
            "display_name": display_name,
            "category": guess_category(service_key, display_name),
            "default_option": default_option,
            "auth_options": auth_options,
            "kind": kind_out,
            "nodes": nodes_section,
        }

    # 5. http_only services: predefined credential, no dedicated node at all
    for c in creds:
        nm = c["name"]
        if nm in abstract_names or nm in used_by_nodes:
            continue
        # not abstract, not used by any node primary/secondary -> http_only
        service_key = snake_case(nm)
        if service_key in registry:
            service_key = service_key + "_http"
        eff = resolve_effective_properties(nm, creds_by_name, cred_cache)
        pattern = classify_connection_pattern(eff)
        registry[service_key] = {
            "service": service_key,
            "display_name": c.get("displayName") or nm,
            "category": guess_category(service_key, c.get("displayName")),
            "default_option": "primary",
            "auth_options": [
                {
                    "option_id": "primary",
                    "label": c.get("displayName") or nm,
                    "n8n_credential_type": nm,
                    "connection_pattern": pattern,
                    "auth_type": {1: "api_key", 2: "oauth2", 4: "oauth2_extra"}[
                        pattern
                    ],
                    "fields": build_fields(eff),
                    "oauth": build_oauth_block(eff) if pattern in (2, 4) else None,
                }
            ],
            "kind": "http_only",
            "nodes": {},
        }

    # 6. generic auth types (httpBasicAuth etc.) -- separate section, not a "service"
    generic_section = {}
    for nm in sorted(genericAuth_names):
        c = creds_by_name[nm]
        eff = resolve_effective_properties(nm, creds_by_name, cred_cache)
        generic_section[nm] = {
            "display_name": c.get("displayName"),
            "fields": build_fields(eff),
        }

    # A handful of AI providers already have a hardcoded, literal service
    # key baked into the rest of the system (the Groq-prompt LLM-step
    # convention: every reasoning/generation step uses "service": "groq",
    # per the original whitelist doc). Auto-derivation from the node name
    # produces a different key for providers whose n8n node has no
    # dedicated non-"lmChat"-prefixed family (groq, openrouter) or whose
    # display name doesn't match the whitelist's spelling (openai,
    # huggingface, mistral, gemini). Rename those specific keys back to
    # what the rest of the system already expects -- confirmed necessary:
    # without this, every generated workflow's AI step resolves as
    # "unmapped" because get_kind("groq") finds nothing.
    AI_PROVIDER_KEY_OVERRIDES = {
        "lm_chat_groq": "groq",
        "lm_chat_open_router": "openrouter",
        "open_ai": "openai",
        "hugging_face": "huggingface",
        "mistral_cloud": "mistral",
        "google_palm": "gemini",
    }
    for old_key, new_key in AI_PROVIDER_KEY_OVERRIDES.items():
        if old_key in registry and new_key not in registry:
            entry = registry.pop(old_key)
            entry["service"] = new_key
            registry[new_key] = entry
        elif old_key in registry:
            report["warnings"].append(
                f"AI provider key override skipped: both '{old_key}' and '{new_key}' "
                f"exist in the registry -- resolve the naming collision manually"
            )

    output = dict(sorted(registry.items()))
    output["_generic_auth_types"] = generic_section
    output["_inline_auth_params"] = {name: hits for name, hits in inline_only_nodes}

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    report["stats"] = {
        "total_nodes": len(nodes),
        "total_credentials": len(creds),
        "abstract_credentials_excluded": len(abstract_names),
        "connectable_services": len(registry),
        "multi_node_hub_services": sum(
            1 for v in registry.values() if v["kind"] == "multi_node_hub"
        ),
        "http_only_services": sum(
            1 for v in registry.values() if v["kind"] == "http_only"
        ),
        "generic_auth_types": len(generic_section),
        "inline_auth_param_nodes": len(inline_only_nodes),
        "credential_free_excluded_nodes": len(credential_free_nodes),
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(json.dumps(report["stats"], indent=2))
    if report["warnings"]:
        print(f"\n{len(report['warnings'])} warnings (see generation_report.json)")


if __name__ == "__main__":
    sys.exit(main())
