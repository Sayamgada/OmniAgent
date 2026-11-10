/**
 * Client for /users/me/n8n -- the user's own n8n connection (n8n_settings.py).
 * Never contains the API key or password in a response.
 */
import { request } from "../agentsApi";

export interface N8nStatus {
  configured: boolean;
  base_url?: string | null;
  email?: string | null;
  connected_at?: string | null;
  /** This user's own OAuth redirect URI, to register in their Google/GitHub/... app. */
  oauth_callback_url?: string | null;
}

export interface N8nConnectBody {
  base_url: string;
  api_key: string;
  email: string;
  password: string;
}

export function getN8nStatus(token: string | null): Promise<N8nStatus> {
  return request("/users/me/n8n", token);
}

/** Validates the URL, API key and login against the user's n8n, then stores them.
 *  A failure is an ApiError (400) whose message is written for the end user. */
export function connectN8n(
  token: string | null,
  body: N8nConnectBody,
): Promise<N8nStatus> {
  return request("/users/me/n8n", token, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** Forgets the connection in OmniAgent only; nothing is deleted on the n8n side.
 *  Saved integrations and agents become stale. */
export function disconnectN8n(token: string | null): Promise<N8nStatus> {
  return request("/users/me/n8n", token, { method: "DELETE" });
}
