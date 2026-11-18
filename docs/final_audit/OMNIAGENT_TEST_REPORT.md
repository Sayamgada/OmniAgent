# OmniAgent — Actual Testing & Verification Report

This document reports the empirical verification and test suite execution results for the **OmniAgent** platform. In accordance with audit standards, tests have been physically executed and verified; no test is claimed to have passed merely because its file exists in the repository.

---

## 1. Test Execution Summary

| Verification Category | Test Framework / Tool | Command Executed | Tests / Files Executed | Result | Status |
|---|---|---|:---:|:---:|:---:|
| **Frontend Unit Tests** | Vitest `v3.2.7` | `npm.cmd --prefix client run test -- --run` | 4 test files / 39 tests | **39 Passed (100%)** | **PASSED** |
| **Frontend Type Checking** | TypeScript `tsc v5.8.3` | `tsc.cmd --project client/tsconfig.app.json --noEmit` | Entire client codebase | **0 Errors** | **PASSED** |
| **Frontend Code Quality** | ESLint `v9.32.0` | `npm.cmd --prefix client run lint` | Entire client codebase | **0 Errors**, 5 pre-existing warnings in dashboard | **PASSED** |
| **Frontend Production Build** | Vite `v5.4.19` (Rollup) | `npm.cmd --prefix client run build` | 3,529 modules transformed | **Built in 43.77s** | **PASSED** |
| **Backend Compiler Tests** | Pytest `v9.2.0` | `pytest server/tests/compiler --ignore=...` | 12 test files / 134 tests | **134 Passed (100%)** | **PASSED** |
| **Backend AI Unit Tests** | Pytest `v9.2.0` | `pytest server/tests/test_ai_*.py ...` | 4 test files / 96 tests | **96 Passed (100%)** | **PASSED** |
| **Backend Auth Unit Tests** | Pytest `v9.2.0` | `pytest server/tests/test_password_hashing.py` | 1 test file / 9 tests | **9 Passed (100%)** | **PASSED** |
| **Backend Stale Path Test** | Pytest `v9.2.0` | Collection check on `test_realignment.py` | 1 test file | **Collection Failed (Errno 2)** | **FAILED (Defect)** |
| **Backend Network/Async Tests** | Pytest `v9.2.0` | Offline Sandbox Evaluation | 8 test files | **Sandbox Blocked** | **NOT EXECUTED** |

---

## 2. Detailed Test Suite Results

### 2.1 Frontend Verification (Vitest & TypeScript)

#### Vitest Test Suite Output:
```
 RUN  v3.2.7 D:/OmniAgent/OmniAgent/client

 ✓ src/lib/api/integrations.test.ts (10 tests) 23ms
 ✓ src/lib/agentsApi.test.ts (23 tests) 108ms
 ✓ src/lib/agentsApi.aiSelection.test.ts (3 tests) 4ms
 ✓ src/components/landing/ThemeToggle.test.tsx (3 tests) 121ms

 Test Files  4 passed (4)
      Tests  39 passed (39)
   Duration  47.56s (transform 1.87s, collect 11.84s, tests 255ms, environment 17.37s, prepare 59.05s)
```

#### Vite Production Build Output:
```
vite v5.4.21 building for production...
✓ 3529 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     1.56 kB │ gzip:   0.68 kB
dist/assets/index-B11VZS1P.css    129.30 kB │ gzip:  20.17 kB
dist/assets/index-fs5ZDzaq.js   1,434.31 kB │ gzip: 429.07 kB
✓ built in 43.77s
```

---

### 2.2 Backend Compiler Verification (134 Tests Passing)

Command: `$env:PYTHONPATH="server"; server\.venv\Scripts\pytest.exe server\tests\compiler --ignore=server/tests/compiler/test_realignment.py`
Execution Duration: `1.02s`

```
server\tests\compiler\test_aggregate.py .....                            [  3%]
server\tests\compiler\test_bindings.py ......                            [  8%]
server\tests\compiler\test_credential_issues.py .........                [ 14%]
server\tests\compiler\test_credential_required.py .....................  [ 30%]
server\tests\compiler\test_gmail_slice.py ..                             [ 32%]
server\tests\compiler\test_golden.py ................................... [ 58%]
server\tests\compiler\test_param_form_e2e.py ...                         [ 60%]
server\tests\compiler\test_param_schema.py ....                          [ 63%]
server\tests\compiler\test_registry_paths.py ....                        [ 66%]
server\tests\compiler\test_rule_branches.py ............................ [ 87%]
.........                                                                [ 94%]
server\tests\compiler\test_supplied_params_blank.py ...                  [ 96%]
server\tests\compiler\test_switch_conditions.py .....                    [100%]
============================= 134 passed in 1.02s =============================
```

---

### 2.3 Backend AI & Security Verification (105 Tests Passing)

Commands:
- `pytest server/tests/test_ai_providers.py server/tests/test_ai_selection.py server/tests/test_ai_selection_for.py server/tests/test_get_chat_model_node.py` -> **96 Passed in 0.77s**
- `pytest -v -s server/tests/test_password_hashing.py` -> **9 Passed in 7.94s**

```
server/tests/test_ai_providers.py ...................................... [ 39%]
........                                                                 [ 47%]
server/tests/test_ai_selection.py ..........................             [ 75%]
server/tests/test_ai_selection_for.py ..........                         [ 85%]
server/tests/test_get_chat_model_node.py ..............                  [100%]
============================= 96 passed in 0.77s ==============================

server/tests/test_password_hashing.py::test_hash_is_bcrypt_and_round_trips PASSED
server/tests/test_password_hashing.py::test_same_password_hashes_differently_each_time PASSED
server/tests/test_password_hashing.py::test_verify_never_raises_on_bad_stored_values PASSED
server/tests/test_password_hashing.py::test_hash_rejects_over_72_bytes PASSED
server/tests/test_password_hashing.py::test_create_user_stores_a_hash_not_the_password PASSED
server/tests/test_password_hashing.py::test_create_user_keeps_none_for_social_login PASSED
server/tests/test_password_hashing.py::test_authenticate_user_accepts_only_the_right_password PASSED
server/tests/test_password_hashing.py::test_authenticate_user_unknown_email_and_google_account PASSED
server/tests/test_password_hashing.py::test_unmigrated_plaintext_row_cannot_log_in PASSED
============================= 9 passed in 7.94s ===============================
```

---

## 3. Discovered Test Failures & Environment-Blocked Tests

### 1. `server/tests/compiler/test_realignment.py` (Defect)
- **Error:** `FileNotFoundError: [Errno 2] No such file or directory: 'D:/Projects/OmniAgent/preview.json'`
- **Root Cause:** Line 8 contains an unportable, hardcoded absolute file path (`preview_json = json.load(open("D:/Projects/OmniAgent/preview.json"))`) belonging to the original developer's local machine path.

### 2. Network-Dependent Integration Tests (Environment Constraint)
The following test suites were **NOT EXECUTED** due to sandbox isolation:
- `test_n8n_url.py` — Calls `socket.getaddrinfo()` to perform live DNS resolution as an SSRF check; times out when network access is isolated.
- `test_agent_lifecycle.py`, `test_ai_provider_router.py`, `test_auth_hardening.py`, `test_extract_edit_loop.py`, `test_n8n_client.py`, `test_stale_instance.py`, `test_workflow_revision.py` — Depend on asynchronous event loops (`asyncio.run()` with `ProactorEventLoop`) and live database session handling that require unsandboxed socket/IPC permissions.

---

## 4. Academic Test-Case Verification Table

| Test ID | Test Suite | Scenario | Expected Behavior | Actual Behavior | Result |
|:---:|:---|:---|:---|:---|:---:|
| **TC-01** | `test_password_hashing.py` | Bcrypt password hashing round-trip | Returns valid `$2b$` salted hash; verifies plain text correctly | Hash verified matching plain text; invalid rejected | **PASS** |
| **TC-02** | `test_password_hashing.py` | Long password rejection (>72 bytes) | Raises `ValueError` to prevent silent Bcrypt byte truncation | `ValueError` raised on 73+ bytes | **PASS** |
| **TC-03** | `test_ai_providers.py` | AI Provider catalog integrity | All 6 providers (Groq, OpenAI, Anthropic, Gemini, Mistral, OpenRouter) defined | All 6 catalog entries present and typed | **PASS** |
| **TC-04** | `test_ai_selection.py` | AI step rewriting in preview IR | Rewrites generic AI node with chosen provider's node type | Preview AI step updated; required credentials updated | **PASS** |
| **TC-05** | `test_golden.py` | Golden compiler pipeline parity | Compiles preview IR into valid n8n graph matching expected fixtures | Matches expected fixture outputs for branching, fanin, linear | **PASS** |
| **TC-06** | `test_rule_branches.py` | Branching conditions in compiler | Correctly compiles IF/SWITCH nodes and routing connections | All 37 branching rule cases verified | **PASS** |
| **TC-07** | `test_credential_issues.py`| Incompatible credential detection | Flags missing or incompatible credentials as `CredentialIssue` | Incompatible/missing credentials correctly identified | **PASS** |
| **TC-08** | `integrations.test.ts` | Integrations API client mapping | Maps backend `/integrations` response to frontend catalog items | Correctly parses `CatalogEntryOut` into UI items | **PASS** |
| **TC-09** | `agentsApi.test.ts` | Parameter form and agent listing | Formats request payloads and handles 409 n8n gate errors | Correctly extracts parameters and triggers n8n modal | **PASS** |
| **TC-10** | `ThemeToggle.test.tsx` | Theme switch toggle behavior | Toggles between light and dark modes in DOM | Correctly modifies HTML class and theme state | **PASS** |
| **TC-11** | `test_realignment.py` | Test realignment against fixture | Realigns test fixture JSON | Failed during collection: path `D:/Projects/OmniAgent/...` | **FAIL** |
