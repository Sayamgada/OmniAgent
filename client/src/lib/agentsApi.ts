/**
 * Typed client for the /agents endpoints used by the Create Agent wizard.
 * Shapes mirror agent_router.py / param_form.py exactly (verified against a
 * real param-schema response from scripts/check_param_overrides.py).
 */

// Vite env var; falls back to the local dev backend.
const envBase = import.meta.env.VITE_API_URL as string | undefined;
export const API_BASE = (envBase ?? "http://localhost:8000").replace(/\/$/, "");

// ---------- types ----------

export interface IntegrationStatus {
  service: string;
  display_name: string;
  required: boolean;
  available: boolean;
}

export interface ExtractWorkflowResponse {
  workflow: Record<string, unknown>;
  integrations: IntegrationStatus[];
  all_required_available: boolean;
}

export interface FieldOption {
  label: string;
  value: unknown;
}

export interface ParamField {
  name: string;
  display_name: string;
  type: string; // string | number | boolean | options | multiOptions | json | dateTime | ...
  required: boolean;
  default: unknown;
  placeholder: string | null;
  description: string | null;
  options: FieldOption[];
}

/** An upstream-data value a field can take instead of typed text (Stage 3.4). */
export interface Binding {
  source: string; // "trigger" | "ai_output"
  label: string; // chip text
  expression: string; // exact parameter value, starts with "="
  default: boolean; // pre-applied when the form first renders
}

export interface StepParamForm {
  step: number;
  service: string;
  display_label: string;
  fields: ParamField[];
  /** field name -> bindings offered for that field */
  bindings?: Record<string, Binding[]>;
}

/** One operation the user can pick for an ambiguous step (verified shape). */
export interface OperationCandidate {
  label: string; // e.g. "Get Many"
  value: string; // n8n operation value, e.g. "getAll" -- sent back as override.operation
  action: string; // e.g. "Get many messages"
}

export interface UnresolvedStep {
  step: number;
  service: string;
  reason: string;
  /** Operation choices for an ambiguous step; empty when there is nothing to pick. */
  candidates: OperationCandidate[];
  /** Set only for "missing required parameter(s)". */
  missing_fields: string[];
}

export interface ParamSchemaResponse {
  is_ready: boolean;
  unresolved_steps: UnresolvedStep[];
  forms: StepParamForm[];
}

export interface StepOverride {
  operation?: string | null;
  target?: string | null;
}
export type Overrides = Record<number, StepOverride>;
/** step number -> field name -> value */
export type ParamValues = Record<number, Record<string, unknown>>;

export interface AgentSummary {
  id: string;
  n8n_workflow_id: string;
  status: string; // "active" | "created" | "failed"
  workflow_name: string;
  last_error: string | null;
}

export interface CreateWorkflowBody {
  params: ParamValues;
  overrides: Overrides;
  workflow_name: string;
}

export interface CreateWorkflowResponse {
  is_deployable: boolean;
  warnings: string[];
  needs_user_input: UnresolvedStep[];
  workflow_json: Record<string, unknown> | null;
  agent: AgentSummary | null;
  credential_issues?: CredentialIssue[];
}

// ---------- plumbing ----------

export class ApiError extends Error {
  status: number;
  /** `detail.code` when the backend sent a structured detail
   *  (e.g. "agent_name_taken" on a 409). */
  code?: string;
  /** Raw `detail` from the response body, for callers that need more than the message. */
  detail?: unknown;
  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      const c = (detail as { code?: unknown }).code;
      if (typeof c === "string") this.code = c;
    }
  }
}

export function detailToMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    // FastAPI 422: [{ loc, msg, type }, ...]
    const msgs = detail
      .map((d) =>
        d &&
        typeof d === "object" &&
        typeof (d as { msg?: unknown }).msg === "string"
          ? (d as { msg: string }).msg
          : null,
      )
      .filter((m): m is string => m !== null);
    if (msgs.length) return msgs.join("; ");
  }
  if (detail && typeof detail === "object") {
    // Structured detail, e.g. { code, message, agent_id } on a 409.
    const m = (detail as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

async function request<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const detail =
      body && typeof body === "object"
        ? (body as { detail?: unknown }).detail
        : undefined;
    throw new ApiError(
      detailToMessage(detail, `Request failed (${res.status})`),
      res.status,
      detail,
    );
  }
  if (res.status === 204) return undefined as T; // DELETE /agents/{id}
  return (await res.json()) as T;
}

// ---------- endpoints ----------

export function extractWorkflow(
  token: string | null,
  payload: {
    domain: string;
    description: string;
    top_k?: number;
    /** automation_name of the workflow this request revises (edit loop).
     *  The backend skips its similarity cache and revises that workflow. */
    edit_of?: string;
  },
): Promise<ExtractWorkflowResponse> {
  return request("/agents/extract-workflow", token, {
    method: "POST",
    body: JSON.stringify({ top_k: 5, ...payload }),
  });
}

export function getParamSchema(
  token: string | null,
  automationName: string,
  overrides: Overrides = {},
): Promise<ParamSchemaResponse> {
  return request(
    `/agents/preview/${encodeURIComponent(automationName)}/param-schema`,
    token,
    { method: "POST", body: JSON.stringify({ overrides }) },
  );
}

export function createWorkflow(
  token: string | null,
  automationName: string,
  body: CreateWorkflowBody,
): Promise<CreateWorkflowResponse> {
  return request(
    `/agents/preview/${encodeURIComponent(automationName)}/create-workflow`,
    token,
    { method: "POST", body: JSON.stringify(body) },
  );
}

/** Retry activation for an agent whose n8n workflow exists but never went active. */
export function activateAgent(
  token: string | null,
  agentId: string,
): Promise<AgentSummary> {
  return request(`/agents/${encodeURIComponent(agentId)}/activate`, token, {
    method: "POST",
  });
}

export interface CredentialIssue {
  step: number;
  service: string;
  node_type: string;
  connected_type: string | null;
  problem: "incompatible" | "missing" | "untyped";
  message: string;
}

// ---------- agent lifecycle (agent_lifecycle.py) ----------

/** created | active | inactive | failed | missing -- kept as string so an
 *  unknown future status degrades to a neutral badge instead of a type error. */
export interface Agent {
  id: string;
  automation_name: string;
  workflow_name: string;
  n8n_workflow_id: string;
  status: string;
  last_error: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** One n8n execution. Field names follow agent_lifecycle.agent_runs but are
 *  NOT yet confirmed against a real run (the live list was empty), so every
 *  field is nullable. */
export interface AgentRun {
  id: string;
  status: string | null;
  mode: string | null;
  started_at: string | null;
  stopped_at: string | null;
}

/** `refresh` re-syncs each agent's status from n8n before returning. */
export async function listAgents(
  token: string | null,
  refresh = false,
): Promise<Agent[]> {
  const data = await request<{ agents: Agent[] }>(
    `/agents${refresh ? "?refresh=true" : ""}`,
    token,
  );
  return data.agents;
}

export function deactivateAgent(
  token: string | null,
  agentId: string,
): Promise<Agent> {
  return request(`/agents/${encodeURIComponent(agentId)}/deactivate`, token, {
    method: "POST",
  });
}

/** Deletes the n8n workflow first, then the row. Resolves on 204. */
export function deleteAgent(
  token: string | null,
  agentId: string,
): Promise<void> {
  return request(`/agents/${encodeURIComponent(agentId)}`, token, {
    method: "DELETE",
  });
}

export async function listAgentRuns(
  token: string | null,
  agentId: string,
  limit = 20,
): Promise<AgentRun[]> {
  const data = await request<{ agent_id: string; runs: AgentRun[] }>(
    `/agents/${encodeURIComponent(agentId)}/runs?limit=${limit}`,
    token,
  );
  return data.runs;
}

// ---------- integration re-check (integration_router.py /integrations/check) ----------

export interface RequiredIntegrationInput {
  service: string;
  display_name: string | null;
  required: boolean;
}

/**
 * The `required_integrations` of a generated workflow, in the shape
 * /integrations/check accepts. Drops malformed entries and any status the
 * server annotated onto them (e.g. `available`), so only service,
 * display_name and required are sent.
 */
export function requiredIntegrationsOf(
  workflow: Record<string, unknown> | null,
): RequiredIntegrationInput[] {
  const raw = workflow?.required_integrations;
  if (!Array.isArray(raw)) return [];
  const out: RequiredIntegrationInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { service, display_name, required } = item as Record<string, unknown>;
    if (typeof service !== "string" || !service) continue;
    out.push({
      service,
      display_name: typeof display_name === "string" ? display_name : null,
      required: required !== false,
    });
  }
  return out;
}

/**
 * Re-checks which of a workflow's required integrations the user has
 * connected, WITHOUT regenerating anything. /integrations/check reports
 * `connected`; the wizard's IntegrationStatus calls the same thing `available`
 * (that is what extract-workflow returns), so this maps one onto the other.
 */
export async function checkIntegrations(
  token: string | null,
  required: RequiredIntegrationInput[],
): Promise<{
  integrations: IntegrationStatus[];
  all_required_available: boolean;
}> {
  const data = await request<{
    integrations: {
      service: string;
      display_name: string | null;
      required: boolean;
      connected: boolean;
    }[];
    all_required_available: boolean;
  }>("/integrations/check", token, {
    method: "POST",
    body: JSON.stringify({ required_integrations: required }),
  });
  return {
    integrations: data.integrations.map((i) => ({
      service: i.service,
      display_name: i.display_name ?? i.service,
      required: i.required,
      available: i.connected,
    })),
    all_required_available: data.all_required_available,
  };
}
