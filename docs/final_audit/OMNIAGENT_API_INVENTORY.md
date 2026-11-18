# OmniAgent — Complete Backend API Inventory

This document provides the definitive, code-verified endpoint inventory for the OmniAgent platform backend. Every endpoint has been verified against runtime FastAPI route introspection and source declarations in `server/app/main.py` and `server/app/routers/`.

---

## 1. Quantitative Endpoint Summary

- **Total Active Application Endpoints:** `28`
- **Total Registered Routers:** `6` routers + root application definitions
- **Framework Documentation Endpoints (OpenAPI / Swagger / ReDoc):** `4` (Excluded from active count, documented in Section 3)
- **Total Application Routes at Runtime:** `32`
- **Active WebSocket Endpoints:** `0`

### Distribution by HTTP Method

| HTTP Method | Count | Percentage |
|---|:---:|:---:|
| `GET` | 12 | 42.9% |
| `POST` | 11 | 39.3% |
| `DELETE` | 3 | 10.7% |
| `PUT` | 2 | 7.1% |
| **Total** | **28** | **100.0%** |

### Distribution by Router

| Router Name | Prefix | File Location | Active Endpoints |
|---|---|---|:---:|
| `app` (Root) | `""` | `server/app/main.py` | 2 |
| `auth_router` | `/auth` | `server/app/routers/auth.py` | 4 |
| `agent_router` | `/agents` | `server/app/routers/agent_router.py` | 6 |
| `agent_lifecycle_router` | `/agents` | `server/app/routers/agent_lifecycle.py` | 4 |
| `integration_router` | `/integrations` | `server/app/routers/integration_router.py` | 6 |
| `ai_provider_router` | `/ai-providers` | `server/app/routers/ai_provider_router.py` | 3 |
| `n8n_settings_router` | `/users/me/n8n` | `server/app/routers/n8n_settings.py` | 3 |
| **Total** | | | **28** |

### Distribution by Authentication Policy

| Security Tier | Count | Percentage | Mechanism |
|---|:---:|:---:|---|
| **Public** | 6 | 21.4% | Open without credentials (`/`, `/search`, `/auth/*`) |
| **Protected (JWT Bearer)** | 15 | 53.6% | Verified via `Depends(get_current_user)` (valid HS256 JWT required) |
| **Protected (JWT + n8n Gate)** | 7 | 25.0% | Verified via `Depends(require_n8n)` (requires valid JWT AND configured n8n connection) |
| **Total** | **28** | **100.0%** | |

---

## 2. Complete Application Endpoint Inventory Table

| Sr. | HTTP Method | Endpoint | Router | Function | Purpose | Request Parameters & Body | Response Structure | Authentication | External Dependency | Status |
|:---:|:---:|:---|:---|:---|:---|:---|:---|:---|:---|:---:|
| 1 | `GET` | `/` | `app` | `root` | System health check and FAISS vector index diagnostic | None | `{"message": "OmniAgent Running"}` | Public | FAISS vectorstore in memory | **Implemented** |
| 2 | `GET` | `/search` | `app` | `search_automations_api` | Semantic vector search across pre-indexed automation templates | Query: `query` (str), `category` (opt), `top_k` (int, def 5) | `{"query": str, "results": list[dict]}` | Public | FAISS vectorstore, HuggingFace embeddings | **Implemented** |
| 3 | `GET` | `/auth/google/login` | `auth_router` | `google_login` | Initiates Google OAuth 2.0 OpenID Connect authorization redirect | None (`request: Request`) | `302 Found` (redirect to Google accounts URL) | Public | Google OAuth 2.0 via Authlib | **Implemented** |
| 4 | `GET` | `/auth/google/callback` | `auth_router` | `google_callback` | Handles Google OAuth code exchange, auto-provisions or links account, issues JWT | Query: `code`, `state` from Google | `302 Found` (redirect to `/oauth/callback?token=...` or `/sign-in?error=...`) | Public | Google OAuth 2.0, PostgreSQL | **Implemented** |
| 5 | `POST` | `/auth/signin` | `auth_router` | `signin` | Authenticates local email/password credentials and issues JWT | Form Body: `username`, `password` (`OAuth2PasswordRequestForm`) | `{"access_token": str, "token_type": "bearer"}` | Public | PostgreSQL, Bcrypt | **Implemented** |
| 6 | `POST` | `/auth/signup` | `auth_router` | `signup` | Registers a new user account with hashed password in PostgreSQL | JSON Body: `UserSignup` (`email`, `password`, `full_name`) | `UserOut` (`id`, `email`, `full_name`, `is_active`, `provider`, `default_ai_provider`, `default_ai_model`) | Public | PostgreSQL, Bcrypt | **Implemented** |
| 7 | `GET` | `/users/me/n8n` | `n8n_settings_router` | `get_n8n_status` | Returns configuration status and OAuth redirect URL of user's personal n8n instance | None | `N8nStatus` (`configured`, `base_url`, `email`, `connected_at`, `oauth_callback_url`) | Protected (JWT) | PostgreSQL | **Implemented** |
| 8 | `PUT` | `/users/me/n8n` | `n8n_settings_router` | `connect_n8n` | Tests URL/ping/login against user's n8n, encrypts secrets via Fernet, and saves connection | JSON Body: `N8nConnectRequest` (`base_url`, `api_key`, `email`, `password`) | `N8nStatus` | Protected (JWT) | PostgreSQL, Fernet, User's n8n instance via HTTPX | **Implemented** |
| 9 | `DELETE` | `/users/me/n8n` | `n8n_settings_router` | `disconnect_n8n` | Disconnects the user's personal n8n instance and clears encrypted secrets | None | `N8nStatus` (`configured`: false) | Protected (JWT) | PostgreSQL | **Implemented** |
| 10 | `GET` | `/ai-providers` | `ai_provider_router` | `list_providers` | Lists supported LLM providers and user's active credential connection status | None | `list[AIProviderOut]` | Protected (JWT) | PostgreSQL, Integration Catalog | **Implemented** |
| 11 | `GET` | `/ai-providers/default` | `ai_provider_router` | `get_default` | Retrieves user's default AI provider and model (defaults to Groq if unset) | None | `AIDefault` (`ai_provider`, `ai_model`) | Protected (JWT) | PostgreSQL | **Implemented** |
| 12 | `PUT` | `/ai-providers/default` | `ai_provider_router` | `put_default` | Saves or clears user's persistent default AI provider and model | JSON Body: `AIDefault` (`ai_provider`, `ai_model`) | `AIDefault` | Protected (JWT) | PostgreSQL | **Implemented** |
| 13 | `GET` | `/integrations` | `integration_router` | `list_integrations` | Lists full 426-service catalog with user's connection and stale status | None | `list[CatalogEntryOut]` | Protected (JWT) | PostgreSQL, Integration Catalog | **Implemented** |
| 14 | `POST` | `/integrations/connect/text-fields` | `integration_router` | `connect_text_fields` | Connects API key / token integration directly to user's n8n instance | JSON Body: `ConnectTextFieldsRequest` (`service`, `values`, `option_id`) | `{"service": str, "auth_option": str, "connected": bool, "n8n_credential_id": str}` | Protected (JWT + n8n Gate) | User's n8n instance via HTTPX, PostgreSQL | **Implemented** |
| 15 | `DELETE` | `/integrations/{service}` | `integration_router` | `disconnect_integration` | Disconnects integration, removing credential from n8n and database | Path: `service` (str) | `{"service": str, "disconnected": true}` | Protected (JWT) | User's n8n instance (optional), PostgreSQL | **Implemented** |
| 16 | `POST` | `/integrations/check` | `integration_router` | `check_integrations` | Validates whether all integrations required by an automation are connected | JSON Body: `CheckIntegrationsRequest` (`required_integrations`) | `CheckIntegrationsResponse` (`all_connected`, `integrations`) | Protected (JWT) | PostgreSQL | **Implemented** |
| 17 | `POST` | `/integrations/oauth/connect` | `integration_router` | `connect_oauth` | Creates OAuth2 credential shell on n8n and returns authorization consent URL | JSON Body: `OAuthConnectInitRequest` (`service`, `client_id`, `client_secret`, `extra_fields`, `option_id`) | `OAuthConnectInitResponse` (`service`, `authorization_url`, `oauth_callback_url`, `n8n_credential_id`) | Protected (JWT + n8n Gate) | User's n8n instance via HTTPX, PostgreSQL | **Implemented** |
| 18 | `GET` | `/integrations/oauth/status/{service}` | `integration_router` | `oauth_status` | Polls n8n instance to check if user finished third-party OAuth popup consent | Path: `service` (str) | `OAuthStatusResponse` (`service`, `connected`, `pending`) | Protected (JWT + n8n Gate) | User's n8n instance via HTTPX | **Implemented** |
| 19 | `POST` | `/agents/extract-workflow` | `agent_router` | `extract_workflow` | Generates workflow IR from prompt via FAISS cache, prompt revision, or Gemini LLM | JSON Body: `WorkflowRequest` (`domain`, `description`, `top_k`, `edit_of`) | `WorkflowResponse` (`workflow`, `integrations`, `all_required_available`) | Protected (JWT) | FAISS, MongoDB, Gemini LLM (`gemini-3.1-flash-lite`), PostgreSQL | **Implemented** |
| 20 | `POST` | `/agents/preview/{automation_name}/ai-selection` | `agent_router` | `select_ai_provider` | Rewrites preview AI node and re-checks integration availability for selected model | Path: `automation_name` (str), JSON Body: `AISelectionFields` (`ai_provider`, `ai_model`) | `WorkflowResponse` | Protected (JWT) | MongoDB, PostgreSQL | **Implemented** |
| 21 | `GET` | `/agents/preview/{automation_name}/param-schema` | `agent_router` | `get_param_schema` | Builds dynamic UI form schema for required node parameters and triggers | Path: `automation_name`, Query: `ai_provider`, `ai_model` | Form schema JSON (`is_ready`, `unresolved_steps`, `forms`) | Protected (JWT) | MongoDB, Compiler | **Implemented** |
| 22 | `POST` | `/agents/preview/{automation_name}/param-schema` | `agent_router` | `post_param_schema` | Builds parameter form schema with candidate overrides applied | Path: `automation_name`, JSON Body: `ParamSchemaRequest` (`overrides`, `ai_provider`, `ai_model`) | Form schema JSON with overrides applied | Protected (JWT) | MongoDB, Compiler | **Implemented** |
| 23 | `POST` | `/agents/preview/{automation_name}/create-workflow` | `agent_router` | `create_workflow` | Compiles IR into n8n graph, pushes to n8n, writes Agent record, activates workflow | Path: `automation_name`, JSON Body: `CreateWorkflowRequest` (`params`, `overrides`, `workflow_name`, `ai_provider`, `ai_model`) | `{"is_deployable": bool, "warnings": list, "needs_user_input": dict/list, "workflow_json": dict, "agent": Optional[dict]}` | Protected (JWT + n8n Gate) | Compiler, User's n8n instance via HTTPX, PostgreSQL | **Implemented** |
| 24 | `GET` | `/agents` | `agent_lifecycle_router` | `list_agents` | Lists user's agents from PostgreSQL; optional live status sync with n8n | Query: `refresh` (bool, default false) | `{"agents": list[dict]}` | Protected (JWT) | PostgreSQL, User's n8n instance (if refresh=true) | **Implemented** |
| 25 | `POST` | `/agents/{agent_id}/activate` | `agent_router` | `activate_agent` | Retries activation in n8n for agent in created/failed state | Path: `agent_id` (UUID) | Agent dictionary (`id`, `n8n_workflow_id`, `status`: "active", `workflow_name`, `last_error`, etc.) | Protected (JWT + n8n Gate) | User's n8n instance via HTTPX, PostgreSQL | **Implemented** |
| 26 | `POST` | `/agents/{agent_id}/deactivate` | `agent_lifecycle_router` | `deactivate_agent` | Deactivates workflow in n8n without deleting it; updates status in database | Path: `agent_id` (UUID) | Agent dictionary (`status`: "inactive") | Protected (JWT + n8n Gate) | User's n8n instance via HTTPX, PostgreSQL | **Implemented** |
| 27 | `DELETE` | `/agents/{agent_id}` | `agent_lifecycle_router` | `delete_agent` | Deletes workflow from n8n first, then deletes Agent row from PostgreSQL | Path: `agent_id` (UUID) | `204 No Content` | Protected (JWT) | User's n8n instance (optional for stale), PostgreSQL | **Implemented** |
| 28 | `GET` | `/agents/{agent_id}/runs` | `agent_lifecycle_router` | `agent_runs` | Fetches recent execution history directly from connected n8n instance | Path: `agent_id` (UUID), Query: `limit` (int, def 20) | `{"agent_id": str, "runs": list[dict]}` | Protected (JWT + n8n Gate) | User's n8n instance via HTTPX | **Implemented** |

---

## 3. System / Documentation Endpoints (Built-in)

The following 4 endpoints are generated by the FastAPI framework for OpenAPI contract distribution and interactive documentation:

| Endpoint | HTTP Method | Handler | Purpose | Authentication |
|---|:---:|---|---|---|
| `/openapi.json` | `GET` | `fastapi.applications:openapi` | Returns machine-readable OpenAPI 3.1 specification JSON | Public |
| `/docs` | `GET` | `fastapi.applications:swagger_ui_html` | Renders Swagger UI interactive API explorer | Public |
| `/docs/oauth2-redirect` | `GET` | `fastapi.applications:swagger_ui_redirect` | OAuth2 redirect helper for Swagger UI | Public |
| `/redoc` | `GET` | `fastapi.applications:redoc_html` | Renders ReDoc clean documentation interface | Public |
