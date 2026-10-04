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
}

// ---------- plumbing ----------

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function detailToMessage(detail: unknown, fallback: string): string {
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
    );
  }
  return (await res.json()) as T;
}

// ---------- endpoints ----------

export function extractWorkflow(
  token: string | null,
  payload: { domain: string; description: string; top_k?: number },
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
