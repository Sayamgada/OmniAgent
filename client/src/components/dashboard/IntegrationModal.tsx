import { useState } from "react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { useAuth } from "../../context/AuthContext";
import {
  upsertIntegration,
  getGoogleOAuthAuthorizeUrl,
  startGoogleOAuthConnect,
} from "../../lib/api/integrations.ts";
import type { IntegrationCatalogItem } from "../../lib/api/integrations.ts";

type IntegrationModalProps = {
  integration: IntegrationCatalogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (service: string) => void;
};

const fieldLabels: Record<string, string> = {
  api_key: "API Key", provider: "Provider", client_id: "Client ID", client_secret: "Client Secret",
  refresh_token: "Refresh Token", bot_token: "Bot Token", connection_string: "Connection String",
  base_id: "Base ID", base_url: "Base URL", webhook_secret: "Webhook Secret",
  account_sid: "Account SID", auth_token: "Auth Token", from_number: "From Number",
  access_token: "Access Token", phone_number_id: "Phone Number ID", host: "Host", port: "Port",
  username: "Username", password: "Password", secret_key: "Secret Key", key_id: "Key ID",
  key_secret: "Key Secret", realm_id: "Realm ID", instance_url: "Instance URL",
  domain: "Domain", email: "Email", api_token: "API Token", token: "Token",
  access_key: "Access Key", bucket_name: "Bucket Name", region: "Region",
  file_path: "File Path", project_url: "Project URL", project_id: "Project ID",
  service_account_json: "Service Account JSON", endpoint_url: "Endpoint URL",
  feed_url: "Feed URL", cx_id: "Search Engine ID (cx)", ig_user_id: "Instagram User ID",
  page_id: "Page ID", api_secret: "API Secret", access_token_secret: "Access Token Secret",
  organization: "Organization", personal_access_token: "Personal Access Token",
  registry_url: "Registry URL", app_password: "App Password", realm: "Realm",
  server_prefix: "Server Prefix",
};

// The only OAuth provider actually wired up today — see google_oauth_router.py.
// Every other oauth/oauth_extra service falls back to the "not yet supported"
// message below until it gets its own registered app + connect route.
const GOOGLE_SERVICES = new Set([
  "gmail", "google_calendar", "drive", "google_docs",
  "google_sheets", "google_sheets_trigger", "google_slides",
  "google_contacts", "google_tasks",
]);

export function IntegrationModal({ integration, open, onOpenChange, onSaved }: IntegrationModalProps) {
  const { token } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  if (!integration) return null;

  // Unchanged from original — only reached when we actually render the field form.
  const handleSave = async () => {
    const missing = integration.fields.filter((f) => !values[f]?.trim());
    if (missing.length > 0) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      await upsertIntegration(token, integration.service, values);
      toast.success(`Connected to ${integration.display_name}`);
      onSaved(integration.service);
      onOpenChange(false);
      setValues({});
    } catch (err: any) {
      toast.error(err.message || "Failed to save integration");
    } finally {
      setSaving(false);
    }
  };

  const handleGoogleConnect = async () => {
    setConnectingGoogle(true);
    try {
      const url = await getGoogleOAuthAuthorizeUrl(token);
      startGoogleOAuthConnect(url); // full-page redirect — component unmounts here
    } catch (err: any) {
      toast.error(err.message || "Failed to start Google connect");
      setConnectingGoogle(false);
    }
  };

  // --- Branch on connection_type ---
  // api_key: always the field form (unchanged behavior).
  // oauth_extra: field form for the extra fields, same as api_key today — the
  //   OAuth-token part of oauth_extra services isn't wired up for any provider
  //   yet, so for now this just collects whatever's in `fields` like api_key does.
  // oauth: no fields to collect — either a real "Connect with Google" button,
  //   or (for every other oauth service right now) an honest "not supported yet".
  // mcp_oauth: no client_id/secret concept at all; not wired into our flow yet.
  const isGoogle = GOOGLE_SERVICES.has(integration.service);
  const showFieldForm =
    integration.connection_type === "api_key" ||
    (integration.connection_type === "oauth_extra" && integration.fields.length > 0);
  const showGoogleConnect =
    integration.connection_type === "oauth" && isGoogle && integration.oauth_connect_available;
  const showUnsupportedOAuth =
    (integration.connection_type === "oauth" || integration.connection_type === "oauth_extra") &&
    !showGoogleConnect;
  const showMcpNotice = integration.connection_type === "mcp_oauth";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {integration.display_name}</DialogTitle>
        </DialogHeader>

        {showFieldForm && (
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {integration.fields.map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={field}>{fieldLabels[field] ?? field}</Label>
                <Input
                  id={field}
                  type={/secret|key|token|password/i.test(field) ? "password" : "text"}
                  value={values[field] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
                  placeholder={fieldLabels[field] ?? field}
                />
              </div>
            ))}
          </div>
        )}

        {showGoogleConnect && (
          <p className="text-sm text-muted-foreground py-2">
            Connecting any Google service links your whole Google account —
            Gmail, Calendar, Drive, Docs, Sheets, Slides, Contacts, and Tasks
            all become available after one sign-in.
          </p>
        )}

        {showUnsupportedOAuth && (
          <p className="text-sm text-muted-foreground py-2">
            In-app connect for {integration.display_name} isn't available yet —
            OmniAgent hasn't registered an OAuth app for this service. Support is
            being added service by service; check back soon.
          </p>
        )}

        {showMcpNotice && (
          <p className="text-sm text-muted-foreground py-2">
            {integration.display_name} uses MCP's own OAuth flow, which isn't
            wired into OmniAgent's connect UI yet. This is on the roadmap.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || connectingGoogle}>
            Cancel
          </Button>

          {showFieldForm && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save & Connect"}
            </Button>
          )}

          {showGoogleConnect && (
            <Button onClick={handleGoogleConnect} disabled={connectingGoogle}>
              {connectingGoogle ? "Redirecting..." : "Connect with Google"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
