# OmniAgent — Verified Technology Stack & Dependency Audit

This document provides a factual, verified inventory of all software technologies, libraries, frameworks, runtime engines, and SDKs employed in the **OmniAgent** platform. Every entry has been cross-referenced against `client/package.json`, `server/requirements.txt`, runtime package manifests, and actual codebase usage.

---

## 1. Verified Technology Stack Table

| Category | Technology | Exact Version | Manifest / Config Location | Actual Role in OmniAgent | Implementation Status |
|---|---|---|---|---|---|
| **Frontend Framework** | React | `18.3.1` | `client/package.json` | Core component UI rendering engine | **Actively Used** |
| **Frontend Language** | TypeScript | `5.8.3` | `client/package.json` | Type-safe frontend application logic | **Actively Used** |
| **Build Tool / Bundler** | Vite | `5.4.19` (Vite 5) | `client/package.json` | High-performance frontend dev server & Rollup production bundler | **Actively Used** |
| **UI Styling** | Tailwind CSS | `3.4.17` | `client/package.json`, `tailwind.config.ts` | Utility-first responsive design tokens, dark/light themes | **Actively Used** |
| **Component Primitives** | Radix UI Primitives | `^1.1.0 - ^2.2.5` | `client/package.json` (26 `@radix-ui/*` packages) | Unstyled accessible primitives (Dialog, Select, Tabs, Switch, Popover, etc.) | **Actively Used** |
| **Component Library** | shadcn/ui | Custom / Tailwind | `client/src/components/ui/` | Tailwind-styled React components built on Radix UI | **Actively Used** |
| **Workflow Canvas** | @xyflow/react (React Flow) | `12.10.2` | `client/package.json` | Node-graph workflow canvas visualization | **Actively Used** |
| **Graph Auto-Layout** | Dagre | `0.8.5` | `client/package.json` | Directed graph layout algorithm for workflow node positioning | **Actively Used** |
| **Animation Engine** | Framer Motion | `11.0.0` | `client/package.json` | Smooth transitions, modal animations, landing page network effects | **Actively Used** |
| **Client Routing** | React Router DOM | `6.30.1` | `client/package.json` | Declarative SPA client-side routing (`BrowserRouter`, `Routes`, `Route`) | **Actively Used** |
| **Server State / Cache** | TanStack React Query | `5.83.0` | `client/package.json` | QueryClient wrapper configured in `App.tsx` | **Partially Used** (QueryClient initialized; most custom API calls use typed fetch in `agentsApi.ts`) |
| **Toast Notifications** | Sonner | `1.7.4` | `client/package.json` | Toast alert notifications across auth, wizard, and dashboard | **Actively Used** |
| **Backend Framework** | FastAPI | `0.115.0` | `server/requirements.txt` | Asynchronous REST API routing, Pydantic validation, dependency injection | **Actively Used** |
| **Backend Language** | Python | `3.11.4` | `server/.venv` | Core server runtime and compiler execution environment | **Actively Used** |
| **ASGI Server** | Uvicorn | `0.30.6` | `server/requirements.txt` | High-performance ASGI server running Starlette / FastAPI | **Actively Used** |
| **Relational Database** | PostgreSQL | 15+ / 16 | `docker-compose.yml`, `POSTGRE_DB_URL` | Primary relational store: `users`, `agents`, `integrations` tables | **Actively Used** |
| **Relational ORM** | SQLAlchemy | `2.0.35` | `server/requirements.txt` | Object-Relational Mapping, connection pooling, declarative models | **Actively Used** |
| **PostgreSQL Driver** | Psycopg 3 | `3.3.8` | `server/requirements.txt` (`psycopg[binary]`) | Native modern async/sync PostgreSQL driver for Python | **Actively Used** |
| **Database Migrations** | Alembic | `1.13.2` | `server/requirements.txt`, `alembic.ini` | Schema migration management and version tracking | **Actively Used** |
| **Document Store** | MongoDB | 6.0+ | `server/requirements.txt`, `pymongo` | Stores unowned, shared workflow preview IR documents in `AutomationPreview` | **Actively Used** |
| **MongoDB Driver** | PyMongo (AsyncMongoClient) | `4.19.0` | `server/requirements.txt` | Async connection to MongoDB cluster/database | **Actively Used** |
| **Vector Index** | FAISS (faiss-cpu) | `1.15.1` | `server/requirements.txt` | In-memory IndexFlatIP cosine similarity search over 906 seed templates | **Actively Used** |
| **Embedding Model** | BAAI/bge-base-en-v1.5 | 768-dim | HuggingFace Hub / `app.core.config` | Sentence embeddings for symmetric short-text semantic matching | **Actively Used** |
| **Embedding Framework** | langchain-huggingface / sentence-transformers | `1.2.3` / `6.2.0` | `server/requirements.txt` | Local CPU embedding generation using Hugging Face transformer models | **Actively Used** |
| **Workflow Synthesis LLM** | Google Gemini (Gemini 1.5/2.0 Flash) | `gemini-3.1-flash-lite` | `server/app/services/llm_service.py` | Synthesizes multi-step workflow IR graph from natural language prompts | **Actively Used** |
| **LLM Client Framework** | langchain-google-genai | `4.4.3` | `server/requirements.txt` | Calls Gemini API with structured JSON output enforcing | **Actively Used** |
| **Target AI Providers** | Groq, OpenAI, Anthropic, Gemini, Mistral, OpenRouter | Multi-model | `server/app/core/ai_providers.py` | Configurable Chat Model nodes embedded within compiled n8n workflows | **Actively Used** |
| **Workflow Execution Engine** | n8n | `n8nio/n8n:latest` | `infrastructure/docker-compose.yml` | Low-code workflow automation runner executing compiled agent pipelines | **Actively Used** |
| **OAuth Integration** | Authlib | `1.3.1` | `server/requirements.txt` | Google OAuth 2.0 OpenID Connect client in `app/routers/auth.py` | **Actively Used** |
| **Password Security** | Bcrypt | `4.0.1` | `server/requirements.txt` | Direct 72-byte salted password hashing in `app/core/auth.py` | **Actively Used** |
| **Token Security** | PyJWT / python-jose | `2.15.1` / `3.3.0` | `server/requirements.txt` | HS256 JWT access token encoding and verification | **Actively Used** |
| **Symmetric Encryption** | Cryptography (Fernet) | `50.0.2` | `server/requirements.txt` | Encrypts n8n API keys and passwords at rest in PostgreSQL | **Actively Used** |
| **HTTP Client** | HTTPX | `0.27.0` | `server/requirements.txt` | Async REST calls to n8n API for workflow lifecycle and executions | **Actively Used** |
| **Document Processing** | PyPDF, BeautifulSoup4 | `7.0.0`, `4.15.0` | `server/requirements.txt` | PDF parsing and HTML scraping packages | **Declared / Dormant** (No active endpoint imports) |
| **Backend Testing** | Pytest | `9.2.0` | `server/requirements.txt` | Unit testing framework (239 passing unit tests) | **Actively Used** |
| **Frontend Testing** | Vitest | `3.2.7` | `client/package.json` | Unit and component testing framework (39 passing unit tests) | **Actively Used** |

---

## 2. Distinction Between Internal LLM vs Executed LLM

A critical technical architectural distinction discovered during the code audit:

1. **Internal Synthesis LLM:** The LLM called *by OmniAgent itself* to translate the user's natural language request into a 5-key workflow intermediate representation (IR) JSON graph. In `server/app/services/llm_service.py`, this is executed by `ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite")` with `response_mime_type="application/json"`.
2. **Target Agent Execution Model:** The AI model configured *inside the generated n8n workflow* to process user tasks when the automation runs. This is user-selectable from `server/app/core/ai_providers.py` across 6 providers:
   - **Groq:** `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`
   - **OpenAI:** `gpt-5-mini`
   - **Anthropic:** `claude-sonnet-5`
   - **Google Gemini:** `gemini-3-flash-preview`
   - **Mistral:** `mistral-small`
   - **OpenRouter:** `openai/gpt-4.1-mini`
   - Plus arbitrary custom model names.
