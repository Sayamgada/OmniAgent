export type IntegrationField = {
  name: string; // camelCase, matches n8n's own field name -- send back exactly as-is
  display_name: string | null;
  type: string; // "string" | "boolean" | "number" | "options" | "hidden" | ...
  secret: boolean;
  default: string | null;
};

export type AuthOption = {
  option_id: string; // e.g. "api_key", "oauth2", "personal_access_token"
  label: string;
  connection_pattern: 1 | 2 | 4; // 1=text fields, 2=oauth2, 4=oauth2+extra fields
  auth_type: string;
  fields: IntegrationField[];
};

export type IntegrationCatalogItem = {
  service: string;
  display_name: string;
  category: string;
  default_option: string;
  auth_options: AuthOption[];
  connected: boolean;
  configured: boolean;
  connected_option: string | null;
};

const API_BASE = "http://127.0.0.1:8000";

function authHeaders(token: string | null) {
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function fetchIntegrations(token: string | null): Promise<IntegrationCatalogItem[]> {
  const res = await fetch(`${API_BASE}/integrations`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to load integrations");
  return res.json();
}

// Pattern 1 (text fields) connect -- covers plain single-method services (Stripe, Groq, ...)
// and the api_key/personal_access_token branch of multi-option services (Notion, GitHub, ...).
export async function connectTextFields(
  token: string | null,
  service: string,
  optionId: string,
  values: Record<string, string>
): Promise<{ service: string; auth_option: string; connected: boolean; n8n_credential_id: string }> {
  const res = await fetch(`${API_BASE}/integrations/connect/text-fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ service, option_id: optionId, values }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to save integration");
  }
  return res.json();
}

// Pattern 2/4 (OAuth2) connect -- works for ANY oauth service, not just Google. The user
// supplies their own client_id/client_secret (registered with n8n's fixed callback URL as
// the redirect URI). Returns an authorization_url; caller opens it in a popup and polls
// checkOAuthStatus until it reports connected.
export async function connectOAuthInit(
  token: string | null,
  service: string,
  optionId: string,
  clientId: string,
  clientSecret: string,
  extraFields: Record<string, string> = {}
): Promise<{ service: string; auth_option: string; n8n_credential_id: string; authorization_url: string }> {
  const res = await fetch(`${API_BASE}/integrations/oauth/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({
      service,
      option_id: optionId,
      client_id: clientId,
      client_secret: clientSecret,
      extra_fields: extraFields,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to start OAuth connect");
  }
  return res.json();
}

export async function checkOAuthStatus(
  token: string | null,
  service: string
): Promise<{ service: string; connected: boolean; pending: boolean }> {
  const res = await fetch(`${API_BASE}/integrations/oauth/status/${service}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to check OAuth status");
  }
  return res.json();
}

export async function deleteIntegration(
  token: string | null,
  service: string
): Promise<{ service: string; disconnected: boolean }> {
  const res = await fetch(`${API_BASE}/integrations/${service}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to remove integration");
  }
  return res.json();
}

// Opens the OAuth consent screen in a popup and polls status until it resolves.
// Resolves true if connected, false if the popup was closed without completing.
export function runOAuthPopupFlow(
  token: string | null,
  service: string,
  authorizationUrl: string,
  { pollIntervalMs = 2000, timeoutMs = 5 * 60 * 1000 }: { pollIntervalMs?: number; timeoutMs?: number } = {}
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const popup = window.open(authorizationUrl, "omniagent-oauth", "width=520,height=680");
    if (!popup) {
      reject(new Error("Popup blocked -- please allow popups for this site"));
      return;
    }

    const startedAt = Date.now();
    const interval = setInterval(async () => {
      if (popup.closed) {
        clearInterval(interval);
        // popup closed -- do one final status check in case the last poll just missed it
        try {
          const status = await checkOAuthStatus(token, service);
          resolve(status.connected);
        } catch {
          resolve(false);
        }
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        clearInterval(interval);
        popup.close();
        reject(new Error("Timed out waiting for OAuth connection"));
        return;
      }
      try {
        const status = await checkOAuthStatus(token, service);
        if (status.connected) {
          clearInterval(interval);
          popup.close();
          resolve(true);
        }
      } catch {
        // transient poll failure -- keep trying until popup closes or timeout hits
      }
    }, pollIntervalMs);
  });
}