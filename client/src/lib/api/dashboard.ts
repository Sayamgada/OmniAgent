/**
 * Client for GET /dashboard/summary (dashboard_router.py): real counts for the
 * dashboard home page. Run stats are best-effort and depend on n8n.
 */
import { request } from "../agentsApi";

export type AgentStatusBucket =
  | "active"
  | "inactive"
  | "created"
  | "failed"
  | "missing"
  | "stale";

export interface DashboardSummary {
  n8n_connected: boolean;
  agents: {
    total: number;
    active: number;
    created_this_month: number;
    needs_attention: number;
    by_status: Record<AgentStatusBucket, number>;
  };
  integrations: { connected: number; pending: number };
  runs: {
    /** false when n8n is not connected or every lookup failed */
    available: boolean;
    window_days: number;
    total: number;
    succeeded: number;
    failed: number;
    /** null when there were no finished runs in the window */
    success_rate: number | null;
    /** some agents' executions could not be read */
    partial: boolean;
    truncated: boolean;
  };
}

export function getDashboardSummary(
  token: string | null,
): Promise<DashboardSummary> {
  return request("/dashboard/summary", token);
}
