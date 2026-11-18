# OmniAgent API Route Audit & Security Summary

This report provides the executive architectural analysis, route metrics, security dependencies, and frontend-backend alignment findings for the OmniAgent platform backend.

---

## A. Route Summary

### 1. Overall Endpoint Metrics
- **Total Active Application HTTP Endpoints:** `28`
- **Total Registered APIRouters:** `6` routers + root application definitions
- **Built-in System / OpenAPI Documentation Routes:** `4` (`/openapi.json`, `/docs`, `/docs/oauth2-redirect`, `/redoc`)
- **Total Application Routes at Runtime:** `32`
- **Active WebSocket Endpoints:** `0`

### 2. Breakdown by HTTP Method

| HTTP Method | Endpoint Count | Percentage |
|:---|:---:|:---:|
| `GET` | 12 | 42.9% |
| `POST` | 11 | 39.3% |
| `DELETE` | 3 | 10.7% |
| `PUT` | 2 | 7.1% |
| **Total** | **28** | **100.0%** |

### 3. Breakdown by Authentication & Security Requirement

| Security Classification | Endpoint Count | Percentage | Description |
|:---|:---:|:---:|:---|
| **Public** | 6 | 21.4% | Open to unauthenticated clients (Health, Search, Auth endpoints) |
| **Authenticated (Standard JWT)** | 15 | 53.6% | Requires valid Bearer JWT (`Depends(get_current_user)`) |
| **Authenticated + n8n Gate** | 7 | 25.0% | Requires Bearer JWT AND verified personal n8n connection (`Depends(require_n8n)`) |
| **Total** | **28** | **100.0%** | |

### 4. Registered Routers Inventory

| Router Variable | Module / File | Prefix | Endpoints | Registration Location |
|:---|:---|:---|:---:|:---|
| `app` (Root) | `server/app/main.py` | `""` | 2 | Instantiated at `main.py#L38` |
| `auth_router` | `server/app/routers/auth.py` | `/auth` | 4 | `main.py#L48` |
| `agent_router` | `server/app/routers/agent_router.py` | `/agents` | 6 | `main.py#L49` |
| `agent_lifecycle_router` | `server/app/routers/agent_lifecycle.py` | `/agents` | 4 | `main.py#L50` |
| `integration_router` | `server/app/routers/integration_router.py` | `/integrations` | 6 | `main.py#L51` |
| `ai_provider_router` | `server/app/routers/ai_provider_router.py` | `/ai-providers` | 3 | `main.py#L52` |
| `n8n_settings_router` | `server/app/routers/n8n_settings.py` | `/users/me/n8n` | 3 | `main.py#L53` |

> [!NOTE]
> `agent_router` and `agent_lifecycle_router` share the `/agents` prefix. Their paths are strictly non-overlapping and designed to separate the heavy Groq LLM/FAISS/compiler compilation stack from fast PostgreSQL lifecycle and execution queries.

---

## B. Unregistered or Inactive Routes

- **Unregistered Routes:** `0`. Every APIRouter defined in `server/app/routers/` is registered in `main.py`.
- **Empty Routers:** `0`. All registered routers declare between 3 and 6 active endpoints.
- **Commented-out Routes:** None found in the active source tree.
- **Duplicate Route Registrations:** None. Although both `agent_router` and `agent_lifecycle_router` use prefix `/agents`, all endpoint patterns and HTTP method combinations are completely unique without conflicts.

---

## C. Frontend-Backend API Mismatches

### 1. Frontend Features Dependent on Mock Data (Missing Backend Routes)

| Feature / UI Page | Frontend File | Description & Missing Backend Capabilities | Severity |
|:---|:---|:---|:---:|
| **Agent Edit Workflow** | `client/src/pages/dashboard/EditAgent.tsx` | The Edit Agent UI relies on mock generator `buildUpdatedWorkflow()` in `edit-agent-data.ts`. The backend does not expose `GET /agents/{id}` (fetching a single agent by ID) or `PUT /agents/{id}` / `PATCH /agents/{id}` (updating/saving a revised workflow graph directly on an existing agent). | Medium |
| **Dashboard Analytics Overview** | `client/src/pages/dashboard/DashboardHome.tsx` | The dashboard overview displays metric cards ("Total Agents", "Total Conversations", "Active Integrations", "Industry Breakdown") using static mock data from `client/src/lib/dashboard-data.ts`. There are no backend metrics or analytics overview endpoints (e.g., `GET /analytics/overview` or `GET /dashboard/stats`). | Low |
| **Document Management** | Referenced in documentation | Conceptual architecture mentions document upload and RAG document stores, but no endpoints (e.g., `POST /documents/upload` or `GET /documents`) exist in the backend codebase. | Info |

### 2. Backend Endpoints Without Direct Frontend Caller

| Backend Endpoint | Router / File | Status & Reason |
|:---|:---|:---|
| `GET /` | `main.py` | Standalone server health/diagnostic endpoint; probed by infrastructure/health monitors rather than client web app. |
| `GET /search` | `main.py` | Standalone semantic search query; the frontend agent wizard instead calls `POST /agents/extract-workflow`, which invokes the Python `search_automations()` function directly. |
| `GET /agents/preview/{automation_name}/param-schema` | `agent_router.py` | The frontend client (`agentsApi.ts#getParamSchema`) intentionally calls the `POST` version of this route (`POST /agents/preview/{automation_name}/param-schema`), allowing it to pass user overrides in the request body. |
| `GET /auth/google/callback` | `auth.py` | Not invoked via client JavaScript `fetch()`; it is the browser-level OAuth redirect target invoked directly by Google's authentication servers. |

---

## D. WebSocket Endpoints

- **Count:** `0`
- **Audit Finding:** There are no active WebSocket endpoints implemented in the backend application. Agent generation and n8n execution statuses are handled via asynchronous HTTP request-response and client polling patterns.

---

## E. Health and Diagnostic Endpoints

- **`GET /` (`server/app/main.py#L56-L59`):**
  - Serves as the primary system availability probe.
  - Returns `{"message": "OmniAgent Running"}`.
  - Internally executes `printVectorStore()` to verify FAISS vector index status in memory.
  - Unauthenticated / Public.

---

## F. Implementation Notes & Architecture Insights

### 1. Functional Scope of Major API Groups

1. **Authentication & User Security (`/auth`):**
   - Implements dual-mode authentication: local credentials (Argon2 / Bcrypt) and Google OAuth 2.0 (OpenID Connect).
   - Generates stateless HS256 JWT bearer tokens containing user subject and profile claims.

2. **AI Agent Generation & Compilation (`/agents/extract-workflow`, `/agents/preview/*`):**
   - **Phase 1 — Semantic Retrieval vs LLM Generation:** Natural language descriptions are matched against pre-indexed automation templates in FAISS using HuggingFace embeddings (`BAAI/bge-small-en-v1.5`). Queries scoring $\ge 0.75$ cosine similarity return cached MongoDB preview IR graphs. Novel queries prompt Groq LLM (`llama-3.3-70b-versatile`) to generate a new intermediate representation (IR) graph.
   - **Phase 2 — AI Provider Binding:** The user's preferred LLM provider (Groq, OpenAI, Anthropic, Gemini, Mistral, OpenRouter) is bound to the preview graph without invalidating the core pipeline.
   - **Phase 3 — Parameter Compilation:** Unresolved step parameters and trigger settings are compiled into dynamic JSON UI forms (`param-schema`).
   - **Phase 4 — n8n Graph Compilation & Deployment:** The compiler converts high-level IR into valid n8n node connections, validates parameters, creates the workflow in the user's personal n8n instance, inserts an `Agent` row in PostgreSQL, and activates the workflow.

3. **Agent Lifecycle & Execution Management (`/agents`, `/agents/{agent_id}/*`):**
   - Bridges OmniAgent's relational PostgreSQL model with live n8n workflows.
   - Features staleness detection (`is_stale`): If a user reconnects or switches their personal n8n instance, agents created on prior instances are marked stale, preventing invalid API calls while permitting direct deletion.
   - Live synchronization (`?refresh=true`) queries n8n directly to reconcile manual changes.

4. **Third-Party Service Integrations (`/integrations`):**
   - Supports 4 authentication patterns:
     - *Pattern 1 (Text Fields):* API keys, tokens, basic credentials (e.g. Stripe, Notion).
     - *Pattern 2/4 (OAuth 2.0):* Popup consent flows mediated by user-configured OAuth clients on n8n (e.g. Google, GitHub, Slack).
   - Provides dry-run credential readiness validation (`/integrations/check`) prior to deployment.

5. **Personal n8n Settings (`/users/me/n8n`):**
   - Enables BYO-n8n (Bring-Your-Own n8n). All credentials, workflows, and executions remain hosted on the user's infrastructure.
   - Sensitive connection secrets (API key, session password) are encrypted at rest in PostgreSQL using symmetric Fernet encryption (`app/utils/crypto.py`).

### 2. Implemented vs Mocked vs Planned Functionality

- **Fully Implemented in Production:**
  - Complete Authentication & Google OAuth linking.
  - Multi-step workflow synthesis, FAISS similarity caching, and Groq LLM generation.
  - High-level preview IR to n8n workflow compiler with parameter schema generation.
  - User-driven AI provider selection across 6 LLM platforms.
  - Full n8n REST client integration (ping, login, workflow create/activate/deactivate/delete, executions list).
  - Fernet encryption for n8n credentials.
  - Staleness isolation for multi-instance integrity.

- **Mocked / Client-Side Simulated:**
  - *Edit Agent Preview:* Handled in the frontend via mock transformations (`edit-agent-data.ts`).
  - *Dashboard Metrics Overview:* Total conversation counters and industry distribution metrics render from mock constants.

- **Planned / Future Architecture:**
  - Live document upload and RAG knowledge base ingestion.
  - Real-time WebSocket streaming of agent workflow execution output.
  - In-place workflow modification (`PUT /agents/{id}`).
