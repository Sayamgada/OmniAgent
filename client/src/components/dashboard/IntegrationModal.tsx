import { useState } from "react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { useAuth } from "../../context/AuthContext";
import { upsertIntegration } from "../../lib/api/integrations.ts";
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

export function IntegrationModal({ integration, open, onOpenChange, onSaved }: IntegrationModalProps) {
  const { token } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!integration) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {integration.display_name}</DialogTitle>
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save & Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}