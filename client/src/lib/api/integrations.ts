export type IntegrationCatalogItem = {
  service: string;
  display_name: string;
  category: string;
  description: string;
  fields: string[];
  connected: boolean;
  configured: boolean;
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