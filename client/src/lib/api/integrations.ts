import { request } from "../agentsApi";

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
  // True when the saved credential belongs to a previous n8n instance. Such an entry is
  // connected=false / configured=true: reconnecting replaces it, deleting removes it.
  // Optional so an older backend degrades to "not stale".
  stale?: boolean;
};

// All calls below go through the shared request() so they get the same API base URL,
// structured error handling (ApiError.message, never "[object Object]") and the
// n8n_not_configured gate.

export function fetchIntegrations(
  token: string | null,
): Promise<IntegrationCatalogItem[]> {
  return request("/integrations", token);
}

// Pattern 1 (text fields) connect -- covers plain single-method services (Stripe, Groq, ...)
// and the api_key/personal_access_token branch of multi-option services (Notion, GitHub, ...).
export function connectTextFields(
  token: string | null,
  service: string,
  optionId: string,
  values: Record<string, string>,
): Promise<{
  service: string;
  auth_option: string;
  connected: boolean;
  n8n_credential_id: string;
}> {
  return request("/integrations/connect/text-fields", token, {
    method: "POST",
    body: JSON.stringify({ service, option_id: optionId, values }),
  });
}

// Pattern 2/4 (OAuth2) connect -- works for ANY oauth service, not just Google. The user
// supplies their own client_id/client_secret (registered with THEIR n8n's callback URL as
// the redirect URI -- returned here as oauth_callback_url). Returns an authorization_url;
// caller opens it in a popup and polls checkOAuthStatus until it reports connected.
export function connectOAuthInit(
  token: string | null,
  service: string,
  optionId: string,
  clientId: string,
  clientSecret: string,
  extraFields: Record<string, string> = {},
): Promise<{
  service: string;
  auth_option: string;
  n8n_credential_id: string;
  authorization_url: string;
  oauth_callback_url?: string | null;
}> {
  return request("/integrations/oauth/connect", token, {
    method: "POST",
    body: JSON.stringify({
      service,
      option_id: optionId,
      client_id: clientId,
      client_secret: clientSecret,
      extra_fields: extraFields,
    }),
  });
}

// Polled every couple of seconds during the OAuth popup, so it must never open the
// "connect n8n" modal mid-flow: gate is off and a 409 is just a failed poll.
export function checkOAuthStatus(
  token: string | null,
  service: string,
): Promise<{ service: string; connected: boolean; pending: boolean }> {
  return request(
    `/integrations/oauth/status/${encodeURIComponent(service)}`,
    token,
    undefined,
    { gate: false },
  );
}

export function deleteIntegration(
  token: string | null,
  service: string,
): Promise<{ service: string; disconnected: boolean }> {
  return request(`/integrations/${encodeURIComponent(service)}`, token, {
    method: "DELETE",
  });
}

// Opens the OAuth consent screen in a popup and polls status until it resolves.
// Resolves true if connected, false if the popup was closed without completing.
export function runOAuthPopupFlow(
  token: string | null,
  service: string,
  authorizationUrl: string,
  {
    pollIntervalMs = 2000,
    timeoutMs = 5 * 60 * 1000,
  }: { pollIntervalMs?: number; timeoutMs?: number } = {},
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      authorizationUrl,
      "omniagent-oauth",
      "width=520,height=680",
    );
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
