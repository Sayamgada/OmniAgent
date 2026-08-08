export type IntegrationCatalogItem = {
  service: string;
  display_name: string;
  category: string;
  connection_type: "api_key" | "oauth" | "oauth_extra" | "mcp_oauth";
  fields: string[];
  connected: boolean;
  configured: boolean;
  oauth_connect_available: boolean;
};

const API_BASE = "http://127.0.0.1:8000";

export async function fetchIntegrations(token: string | null): Promise<IntegrationCatalogItem[]> {
  const res = await fetch(`${API_BASE}/integrations`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error("Failed to load integrations");
  return res.json();
}

export async function upsertIntegration(
  token: string | null,
  service: string,
  credentials: Record<string, string>
): Promise<{ service: string; display_name: string; connected: boolean }> {
  const res = await fetch(`${API_BASE}/integrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ service, credentials }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to save integration");
  }
  return res.json();
}

export async function toggleIntegration(
  token: string | null,
  service: string
): Promise<{ service: string; connected: boolean }> {
  const res = await fetch(`${API_BASE}/integrations/${service}/toggle`, {
    method: "PATCH",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to update integration");
  }
  return res.json();
}

export async function deleteIntegration(
  token: string | null,
  service: string
): Promise<{ service: string; deleted: boolean }> {
  const res = await fetch(`${API_BASE}/integrations/${service}`, {
    method: "DELETE",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to remove integration");
  }
  return res.json();
}

// Kicks off the "Connect Google" flow. This is a fetch (has the auth header),
// which returns a URL — the caller then does a full-page redirect to it.
// A single consent here connects all 9 registered Google catalog services at once.
export async function getGoogleOAuthAuthorizeUrl(token: string | null): Promise<string> {
  const res = await fetch(`${API_BASE}/integrations/oauth/google/start`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error("Failed to start Google connect flow");
  const data = await res.json();
  return data.authorize_url;
}

export function startGoogleOAuthConnect(authorizeUrl: string) {
  // Full-page navigation, not fetch — the browser needs to actually land on
  // Google's consent screen, which then redirects to our backend callback,
  // which redirects back to /integrations with a result flag in the query string.
  window.location.href = authorizeUrl;
}