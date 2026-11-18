# Appendix A: API Route Summary & Inventory

This document provides a complete, code-level inventory of all active application programming interface (API) routes in the OmniAgent backend platform. Every endpoint recorded below has been verified directly against the running FastAPI application source code and its router registrations in `server/app/main.py`.

---

## 1. Master API Route Table

| Sr. No. | API Area | HTTP Method | Complete API Route | Authentication | Purpose |
|:---:|:---|:---:|:---|:---|:---|
| 1 | Health / Diagnostic | `GET` | `/` | Public | Root health check and FAISS vectorstore in-memory index diagnostic |
| 2 | Semantic Search / FAISS | `GET` | `/search` | Public | Semantic vector search across pre-indexed automation templates using HuggingFace embeddings |
| 3 | Authentication | `GET` | `/auth/google/login` | Public | Initiates Google OAuth 2.0 OpenID Connect authorization redirect flow |
| 4 | Authentication | `GET` | `/auth/google/callback` | Public | Handles Google OAuth callback, verifies user profile, links or creates account, and issues JWT |
| 5 | Authentication | `POST` | `/auth/signin` | Public | Authenticates local email/password credentials and issues JWT access token |
| 6 | Authentication | `POST` | `/auth/signup` | Public | Registers a new user account with hashed password credentials in PostgreSQL |
| 7 | User / n8n Settings | `GET` | `/users/me/n8n` | Authenticated | Retrieves configuration status, base URL, and OAuth redirect URI of user's personal n8n instance |
| 8 | User / n8n Settings | `PUT` | `/users/me/n8n` | Authenticated | Validates, tests ping/login, encrypts credentials via Fernet, and saves user's personal n8n connection |
| 9 | User / n8n Settings | `DELETE` | `/users/me/n8n` | Authenticated | Disconnects the user's personal n8n instance and purges encrypted secrets from the database |
| 10 | AI/LLM Integration | `GET` | `/ai-providers` | Authenticated | Lists all supported AI model providers (Groq, OpenAI, Anthropic, Gemini, Mistral, OpenRouter) and connection statuses |
| 11 | AI/LLM Integration | `GET` | `/ai-providers/default` | Authenticated | Retrieves the user's preferred default AI provider and model (defaults to Groq if unset) |
| 12 | AI/LLM Integration | `PUT` | `/ai-providers/default` | Authenticated | Updates or clears the user's persistent default AI provider and model selection |
| 13 | Integrations | `GET` | `/integrations` | Authenticated | Lists the full third-party service catalog merged with user's active/stale credential connection statuses |
| 14 | Integrations | `POST` | `/integrations/connect/text-fields` | Authenticated (n8n Gate) | Connects API key / token credentials (Pattern 1) directly to user's n8n instance and records credential bridge |
| 15 | Integrations | `DELETE` | `/integrations/{service}` | Authenticated | Disconnects a third-party service, removing credentials from n8n and database (supports stale credential cleanup) |
| 16 | Integrations | `POST` | `/integrations/check` | Authenticated | Verifies whether all third-party integrations required by an automation are currently connected by the user |
| 17 | Integrations | `POST` | `/integrations/oauth/connect` | Authenticated (n8n Gate) | Initializes OAuth 2.0 connection (Pattern 2/4) on user's n8n instance and returns provider authorization consent URL |
| 18 | Integrations | `GET` | `/integrations/oauth/status/{service}` | Authenticated (n8n Gate) | Polls n8n instance to check if user completed the third-party OAuth popup consent flow |
| 19 | Agent Generation | `POST` | `/agents/extract-workflow` | Authenticated | Generates workflow intermediate representation (IR) from natural language prompt via FAISS cache or Groq LLM |
| 20 | Agent Generation | `POST` | `/agents/preview/{automation_name}/ai-selection` | Authenticated | Rewrites preview AI node and re-checks integration availability for a selected AI provider/model |
| 21 | Agent Generation | `GET` | `/agents/preview/{automation_name}/param-schema` | Authenticated | Builds dynamic UI form schema for required node parameters and triggers in an automation |
| 22 | Agent Generation | `POST` | `/agents/preview/{automation_name}/param-schema` | Authenticated | Builds parameter form schema with user's ambiguous operation/target candidate overrides applied |
| 23 | Agent Generation & Deployment | `POST` | `/agents/preview/{automation_name}/create-workflow` | Authenticated (n8n Gate) | Compiles preview IR into n8n executable JSON, creates workflow in n8n, writes Agent record, and activates workflow |
| 24 | Agent Management | `GET` | `/agents` | Authenticated | Lists all agents created by current user; supports optional live status re-sync from n8n (`?refresh=true`) |
| 25 | Agent Management | `POST` | `/agents/{agent_id}/activate` | Authenticated (n8n Gate) | Retries activation in n8n for an agent in created/failed state and marks status as active |
| 26 | Agent Management | `POST` | `/agents/{agent_id}/deactivate` | Authenticated (n8n Gate) | Deactivates an active workflow in n8n without deleting it and sets agent status to inactive |
| 27 | Agent Management | `DELETE` | `/agents/{agent_id}` | Authenticated | Deletes workflow from n8n first, then deletes Agent bridge record from PostgreSQL (supports stale agent deletion) |
| 28 | Agent Management / Analytics | `GET` | `/agents/{agent_id}/runs` | Authenticated (n8n Gate) | Fetches recent execution history and execution statuses for the agent directly from the connected n8n instance |

---

## 2. In-Depth Endpoint Specifications

### 2.1 Health & Diagnostics

#### Endpoint 1: `GET /`
- **Source Definition:** `server/app/main.py#L56-L59`
- **Router Registration:** `server/app/main.py#L38` (Root FastAPI instance)
- **Authentication:** Public
- **Request Parameters:** None
- **Response Format:** `{"message": "OmniAgent Running"}`
- **Operation / Logic:** Invokes `printVectorStore()` to check that the FAISS index is loaded in memory and outputs a basic system confirmation response.

---

### 2.2 Semantic Search & FAISS Retrieval

#### Endpoint 2: `GET /search`
- **Source Definition:** `server/app/main.py#L62-L73`
- **Router Registration:** `server/app/main.py#L38` (Root FastAPI instance)
- **Authentication:** Public
- **Request Parameters:**
  - Query: `query` (`str`, required) — Natural language intent or keyword search.
  - Query: `category` (`str | None`, optional) — Domain filter (`Corporate`, `Education`, `Finance`).
  - Query: `top_k` (`int`, default `5`) — Number of nearest neighbor matches to retrieve.
- **Response Format:** `{"query": str, "results": list[dict]}`
- **Operation / Logic:** Encodes query using `BAAI/bge-small-en-v1.5` HuggingFace embeddings and performs cosine similarity search on the local FAISS index (`server/faiss_index/index.faiss`).

---

### 2.3 Authentication & Identity

#### Endpoint 3: `GET /auth/google/login`
- **Source Definition:** `server/app/routers/auth.py#L50-L55`
- **Router Registration:** `server/app/main.py#L48` (`auth_router`, prefix `/auth`)
- **Authentication:** Public
- **Request Parameters:** None (Starlette `Request`)
- **Response Format:** `302 Found` (HTTP redirect)
- **Operation / Logic:** Uses Authlib Starlette client configured with Google OpenID Connect metadata to generate the OAuth authorization URL and redirects user to Google's consent screen.

#### Endpoint 4: `GET /auth/google/callback`
- **Source Definition:** `server/app/routers/auth.py#L58-L115`
- **Router Registration:** `server/app/main.py#L48` (`auth_router`, prefix `/auth`)
- **Authentication:** Public (OAuth authorization code exchange)
- **Dependencies:** `db: Session = Depends(get_postgres_db)`
- **Request Parameters:** Query parameters received from Google (`code`, `state`)
- **Response Format:** `302 Found` redirect to `${FRONTEND_BASE_URL}/oauth/callback?token=...` or error redirect to `${FRONTEND_BASE_URL}/sign-in?error=...`
- **Operation / Logic:** Exchanges authorization code for access token, extracts verified Google userinfo (`email`, `sub`, `name`), links existing local accounts or creates new users in PostgreSQL, and issues a signed JWT access token.

#### Endpoint 5: `POST /auth/signin`
- **Source Definition:** `server/app/routers/auth.py#L117-L143`
- **Router Registration:** `server/app/main.py#L48` (`auth_router`, prefix `/auth`)
- **Authentication:** Public
- **Dependencies:** `form_data: OAuth2PasswordRequestForm = Depends()`, `db: Session = Depends(get_postgres_db)`
- **Request Body:** Form data (`username`: email, `password`: plain text)
- **Response Format:** `{"access_token": str, "token_type": "bearer"}`
- **Operation / Logic:** Queries user by email, verifies password hash using Passlib (Argon2 / Bcrypt), checks `is_active` status, and generates a signed HS256 JWT access token.

#### Endpoint 6: `POST /auth/signup`
- **Source Definition:** `server/app/routers/auth.py#L145-L170`
- **Router Registration:** `server/app/main.py#L48` (`auth_router`, prefix `/auth`)
- **Authentication:** Public
- **Dependencies:** `db: Session = Depends(get_postgres_db)`
- **Request Body:** `UserSignup` (`email`: EmailStr, `password`: str, `full_name`: str)
- **Response Format:** `UserOut` (`id`, `email`, `full_name`, `is_active`, `provider`, `default_ai_provider`, `default_ai_model`)
- **Operation / Logic:** Validates password policy (minimum 8 characters, maximum 72 bytes), verifies email uniqueness, securely hashes password, and creates a local user row in PostgreSQL.

---

### 2.4 User Profile & Personal n8n Instance Configuration

#### Endpoint 7: `GET /users/me/n8n`
- **Source Definition:** `server/app/routers/n8n_settings.py#L45-L47`
- **Router Registration:** `server/app/main.py#L53` (`n8n_settings_router`, prefix `/users/me/n8n`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `user: User = Depends(get_current_user)`
- **Request Parameters:** None
- **Response Format:** `N8nStatus` (`configured`: bool, `base_url`: str | null, `email`: str | null, `connected_at`: datetime | null, `oauth_callback_url`: str | null)
- **Operation / Logic:** Returns the connection state of the user's personal n8n instance and computes the instance-specific OAuth callback URL (`{base_url}/rest/oauth2-credential/callback`).

#### Endpoint 8: `PUT /users/me/n8n`
- **Source Definition:** `server/app/routers/n8n_settings.py#L50-L108`
- **Router Registration:** `server/app/main.py#L53` (`n8n_settings_router`, prefix `/users/me/n8n`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `body: N8nConnectRequest`, `user: User = Depends(get_current_user)`, `db: Session = Depends(get_postgres_db)`
- **Request Body:** `N8nConnectRequest` (`base_url`: str, `api_key`: SecretStr, `email`: str, `password`: SecretStr)
- **Response Format:** `N8nStatus`
- **Operation / Logic:** Validates n8n URL (blocks private/loopback addresses in production), runs live connectivity tests (probe ping via API key, session login via email/password), encrypts secrets using Fernet symmetric encryption, assigns a new `n8n_connection_id` UUID stamp if the URL changed, and updates PostgreSQL.

#### Endpoint 9: `DELETE /users/me/n8n`
- **Source Definition:** `server/app/routers/n8n_settings.py#L110-L124`
- **Router Registration:** `server/app/main.py#L53` (`n8n_settings_router`, prefix `/users/me/n8n`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `user: User = Depends(get_current_user)`, `db: Session = Depends(get_postgres_db)`
- **Request Parameters:** None
- **Response Format:** `N8nStatus` (`configured`: false)
- **Operation / Logic:** Clears encrypted API keys, passwords, and connection IDs from PostgreSQL and evicts cached HTTP client sessions.

---

### 2.5 AI Provider & Model Management

#### Endpoint 10: `GET /ai-providers`
- **Source Definition:** `server/app/routers/ai_provider_router.py#L18-L50`
- **Router Registration:** `server/app/main.py#L52` (`ai_provider_router`, prefix `/ai-providers`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `db: Session = Depends(get_postgres_db)`, `current_user: User = Depends(get_current_user)`
- **Request Parameters:** None
- **Response Format:** `list[AIProviderOut]` (service key, display name, default model, model list, connected flag, node type, node type version)
- **Operation / Logic:** Inspects the system AI provider registry and checks the user's active credentials in PostgreSQL to return provider availability and connection states.

#### Endpoint 11: `GET /ai-providers/default`
- **Source Definition:** `server/app/routers/ai_provider_router.py#L65-L69`
- **Router Registration:** `server/app/main.py#L52` (`ai_provider_router`, prefix `/ai-providers`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `current_user: User = Depends(get_current_user)`
- **Request Parameters:** None
- **Response Format:** `AIDefault` (`ai_provider`: str | null, `ai_model`: str | null)
- **Operation / Logic:** Returns the user's saved default AI provider and model (falls back to Groq / `llama-3.3-70b-versatile` if none set).

#### Endpoint 12: `PUT /ai-providers/default`
- **Source Definition:** `server/app/routers/ai_provider_router.py#L71-L99`
- **Router Registration:** `server/app/main.py#L52` (`ai_provider_router`, prefix `/ai-providers`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `body: AIDefault`, `db: Session = Depends(get_postgres_db)`, `current_user: User = Depends(get_current_user)`
- **Request Body:** `AIDefault` (`ai_provider`: Optional[str], `ai_model`: Optional[str])
- **Response Format:** `AIDefault`
- **Operation / Logic:** Validates provider key against catalog (raises 422 if invalid) and commits updated defaults to the `users` table.

---

### 2.6 Third-Party Service Integrations

#### Endpoint 13: `GET /integrations`
- **Source Definition:** `server/app/routers/integration_router.py#L24-L32`
- **Router Registration:** `server/app/main.py#L51` (`integration_router`, prefix `/integrations`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `db: Session = Depends(get_postgres_db)`, `current_user: User = Depends(get_current_user)`
- **Request Parameters:** None
- **Response Format:** `list[CatalogEntryOut]`
- **Operation / Logic:** Returns all catalog services (Gmail, Slack, GitHub, Stripe, Notion, etc.) annotated with the user's connection status and staleness flags.

#### Endpoint 14: `POST /integrations/connect/text-fields`
- **Source Definition:** `server/app/routers/integration_router.py#L35-L58`
- **Router Registration:** `server/app/main.py#L51` (`integration_router`, prefix `/integrations`)
- **Authentication:** Authenticated + n8n Required (`Depends(get_current_user)`, `Depends(require_n8n)`)
- **Dependencies:** `body: ConnectTextFieldsRequest`, `db: Session`, `current_user: User`, `n8n: N8nClient`
- **Request Body:** `ConnectTextFieldsRequest` (`service`: str, `values`: dict[str, str], `option_id`: Optional[str])
- **Response Format:** `{"service": str, "auth_option": str, "connected": bool, "n8n_credential_id": str}`
- **Operation / Logic:** Creates credential payload in the user's n8n instance via API, receives the n8n credential ID, and records an active integration row in PostgreSQL.

#### Endpoint 15: `DELETE /integrations/{service}`
- **Source Definition:** `server/app/routers/integration_router.py#L60-L80`
- **Router Registration:** `server/app/main.py#L51` (`integration_router`, prefix `/integrations`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `service: str` (path), `db: Session`, `current_user: User`
- **Request Parameters:** Path `service` (`str`)
- **Response Format:** `{"service": str, "disconnected": true}`
- **Operation / Logic:** Deletes credential from n8n (if live) and deletes the integration row from PostgreSQL. If the credential is stale, safely deletes from database without requiring n8n connectivity.

#### Endpoint 16: `POST /integrations/check`
- **Source Definition:** `server/app/routers/integration_router.py#L82-L95`
- **Router Registration:** `server/app/main.py#L51` (`integration_router`, prefix `/integrations`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `body: CheckIntegrationsRequest`, `db: Session`, `current_user: User`
- **Request Body:** `CheckIntegrationsRequest` (`required_integrations`: list[RequiredIntegration])
- **Response Format:** `CheckIntegrationsResponse` (`all_connected`: bool, `integrations`: list[IntegrationStatus])
- **Operation / Logic:** Performs a dry-run against the `integrations` table to check whether all integrations required by an automation are connected for the user's active n8n instance.

#### Endpoint 17: `POST /integrations/oauth/connect`
- **Source Definition:** `server/app/routers/integration_router.py#L97-L128`
- **Router Registration:** `server/app/main.py#L51` (`integration_router`, prefix `/integrations`)
- **Authentication:** Authenticated + n8n Required (`Depends(get_current_user)`, `Depends(require_n8n)`)
- **Dependencies:** `body: OAuthConnectInitRequest`, `db: Session`, `current_user: User`, `n8n: N8nClient`
- **Request Body:** `OAuthConnectInitRequest` (`service`: str, `client_id`: str, `client_secret`: str, `extra_fields`: dict, `option_id`: Optional[str])
- **Response Format:** `OAuthConnectInitResponse` (`service`, `authorization_url`, `oauth_callback_url`, `n8n_credential_id`)
- **Operation / Logic:** Creates an OAuth2 credential shell on the user's n8n instance and returns the provider authorization URL to open in a popup consent window.

#### Endpoint 18: `GET /integrations/oauth/status/{service}`
- **Source Definition:** `server/app/routers/integration_router.py#L130-L139`
- **Router Registration:** `server/app/main.py#L51` (`integration_router`, prefix `/integrations`)
- **Authentication:** Authenticated + n8n Required (`Depends(get_current_user)`, `Depends(require_n8n)`)
- **Dependencies:** `service: str` (path), `db: Session`, `current_user: User`, `n8n: N8nClient`
- **Request Parameters:** Path `service` (`str`)
- **Response Format:** `OAuthStatusResponse` (`service`: str, `connected`: bool, `pending`: bool)
- **Operation / Logic:** Inspects the n8n credential shell to determine whether OAuth tokens have been successfully granted and saved.

---

### 2.7 Agent Generation, Workflow IR & Parameter Compilation

#### Endpoint 19: `POST /agents/extract-workflow`
- **Source Definition:** `server/app/routers/agent_router.py#L156-L277`
- **Router Registration:** `server/app/main.py#L49` (`agent_router`, prefix `/agents`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `body: WorkflowRequest`, `db: Session`, `current_user: User`
- **Request Body:** `WorkflowRequest` (`domain`: "Corporate"|"Education"|"Finance", `description`: str, `top_k`: int, `edit_of`: Optional[str])
- **Response Format:** `WorkflowResponse` (`workflow`: dict, `integrations`: list[dict], `all_required_available`: bool)
- **Operation / Logic:**
  1. If `edit_of` is provided, fetches previous preview from MongoDB and executes Groq LLM revision loop with unique revision name generation.
  2. Otherwise, executes FAISS similarity search.
  3. If similarity score >= `0.75` (calibrated threshold) and cached schema is valid, serves preview from MongoDB.
  4. If similarity < `0.75`, synthesizes workflow IR via Groq LLM (`llama-3.3-70b-versatile`), saves to MongoDB, and indexes seed in FAISS.
  5. Binds user's default AI provider/model and checks integration availability.

#### Endpoint 20: `POST /agents/preview/{automation_name}/ai-selection`
- **Source Definition:** `server/app/routers/agent_router.py#L378-L406`
- **Router Registration:** `server/app/main.py#L49` (`agent_router`, prefix `/agents`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `automation_name: str` (path), `body: AISelectionFields`, `db: Session`, `current_user: User`
- **Request Parameters:** Path `automation_name`, Body `AISelectionFields` (`ai_provider`: Optional[str], `ai_model`: Optional[str])
- **Response Format:** `WorkflowResponse`
- **Operation / Logic:** Dynamically rewrites the AI model node in the preview workflow with the user's chosen provider/model and recalculates required integration availability without full regeneration.

#### Endpoint 21: `GET /agents/preview/{automation_name}/param-schema`
- **Source Definition:** `server/app/routers/agent_router.py#L408-L429`
- **Router Registration:** `server/app/main.py#L49` (`agent_router`, prefix `/agents`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `automation_name: str` (path), Query `ai_provider` (str | null), Query `ai_model` (str | null), `current_user: User`
- **Response Format:** Form schema JSON (`is_ready`, `unresolved_steps`, `forms`)
- **Operation / Logic:** Parses intermediate preview steps and generates dynamic form definitions for missing required parameters, credential options, and upstream node data bindings.

#### Endpoint 22: `POST /agents/preview/{automation_name}/param-schema`
- **Source Definition:** `server/app/routers/agent_router.py#L431-L456`
- **Router Registration:** `server/app/main.py#L49` (`agent_router`, prefix `/agents`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `automation_name: str` (path), `body: ParamSchemaRequest`, `current_user: User`
- **Request Body:** `ParamSchemaRequest` (`ai_provider`, `ai_model`, `overrides`: dict[int, StepOverrideRequest])
- **Response Format:** Form schema JSON
- **Operation / Logic:** Applies user overrides for ambiguous operations/targets and returns the updated parameter form schema.

#### Endpoint 23: `POST /agents/preview/{automation_name}/create-workflow`
- **Source Definition:** `server/app/routers/agent_router.py#L458-L580`
- **Router Registration:** `server/app/main.py#L49` (`agent_router`, prefix `/agents`)
- **Authentication:** Authenticated + n8n Required (`Depends(get_current_user)`, `Depends(require_n8n)`)
- **Dependencies:** `automation_name: str` (path), `body: CreateWorkflowRequest`, `db: Session`, `current_user: User`, `n8n: N8nClient`
- **Request Body:** `CreateWorkflowRequest` (`params`: dict, `overrides`: dict, `workflow_name`: str, `ai_provider`: Optional[str], `ai_model`: Optional[str])
- **Response Format:** `{"is_deployable": bool, "warnings": list, "needs_user_input": dict/list, "workflow_json": dict, "agent": Optional[dict]}`
- **Operation / Logic:** Compiles preview IR using supplied parameters and resolved credentials. If deployable:
  1. Checks for duplicate agent names in PostgreSQL (returns 409 conflict if name exists).
  2. Pushes compiled workflow graph JSON to the user's n8n instance via REST API.
  3. Writes `Agent` bridge record in PostgreSQL with `n8n_connection_id` stamp.
  4. Activates workflow in n8n. If activation fails, marks status as `created` with `last_error` and returns warnings.

---

### 2.8 Agent Lifecycle & Execution Management

#### Endpoint 24: `GET /agents`
- **Source Definition:** `server/app/routers/agent_lifecycle.py#L194-L222`
- **Router Registration:** `server/app/main.py#L50` (`agent_lifecycle_router`, prefix `/agents`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** Query `refresh` (`bool`, default `False`), `db: Session`, `current_user: User`
- **Response Format:** `{"agents": list[dict]}`
- **Operation / Logic:** Queries PostgreSQL for all agents owned by the user. If `?refresh=true` and n8n is connected, runs concurrent `get_workflow` queries to n8n to sync live activation statuses.

#### Endpoint 25: `POST /agents/{agent_id}/activate`
- **Source Definition:** `server/app/routers/agent_router.py#L594-L634`
- **Router Registration:** `server/app/main.py#L49` (`agent_router`, prefix `/agents`)
- **Authentication:** Authenticated + n8n Required (`Depends(get_current_user)`, `Depends(require_n8n)`)
- **Dependencies:** `agent_id: uuid.UUID` (path), `db: Session`, `current_user: User`, `n8n: N8nClient`
- **Response Format:** Agent dictionary (`id`, `n8n_workflow_id`, `status`: "active", `workflow_name`, `last_error`, `ai_provider`, `ai_model`)
- **Operation / Logic:** Re-activates an agent workflow in n8n; guards against stale instances (409) and updates PostgreSQL record to active.

#### Endpoint 26: `POST /agents/{agent_id}/deactivate`
- **Source Definition:** `server/app/routers/agent_lifecycle.py#L225-L252`
- **Router Registration:** `server/app/main.py#L50` (`agent_lifecycle_router`, prefix `/agents`)
- **Authentication:** Authenticated + n8n Required (`Depends(get_current_user)`, `Depends(require_n8n)`)
- **Dependencies:** `agent_id: uuid.UUID` (path), `db: Session`, `current_user: User`, `n8n: N8nClient`
- **Response Format:** Agent dictionary (`status`: "inactive")
- **Operation / Logic:** Deactivates the workflow in n8n without deleting it and sets `status = "inactive"` in PostgreSQL.

#### Endpoint 27: `DELETE /agents/{agent_id}`
- **Source Definition:** `server/app/routers/agent_lifecycle.py#L254-L302`
- **Router Registration:** `server/app/main.py#L50` (`agent_lifecycle_router`, prefix `/agents`)
- **Authentication:** Authenticated (`Depends(get_current_user)`)
- **Dependencies:** `agent_id: uuid.UUID` (path), `db: Session`, `current_user: User`
- **Response Format:** `204 No Content`
- **Operation / Logic:** If stale, deletes PostgreSQL row directly. If fresh, deactivates and deletes the workflow from n8n first, then deletes the database row.

#### Endpoint 28: `GET /agents/{agent_id}/runs`
- **Source Definition:** `server/app/routers/agent_lifecycle.py#L305-L333`
- **Router Registration:** `server/app/main.py#L50` (`agent_lifecycle_router`, prefix `/agents`)
- **Authentication:** Authenticated + n8n Required (`Depends(get_current_user)`, `Depends(require_n8n)`)
- **Dependencies:** `agent_id: uuid.UUID` (path), Query `limit` (`int`, default `20`, 1-100), `db: Session`, `current_user: User`, `n8n: N8nClient`
- **Response Format:** `{"agent_id": str, "runs": list[{"id": str, "status": str, "mode": str, "started_at": str, "stopped_at": str}]}`
- **Operation / Logic:** Fetches execution history from n8n REST API (`/executions?workflowId={id}&limit={limit}`).
