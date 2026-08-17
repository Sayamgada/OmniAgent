import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { useAuth } from "../../context/AuthContext";
import {
  connectTextFields,
  connectOAuthInit,
  runOAuthPopupFlow,
} from "../../lib/api/integrations.ts";
import type { IntegrationCatalogItem, AuthOption } from "../../lib/api/integrations.ts";

type IntegrationModalProps = {
  integration: IntegrationCatalogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (service: string) => void;
};

// Fields n8n marks "hidden" carry a baked-in default (e.g. base URLs) and aren't meant to be
// user-editable -- skip those. Also skip "boolean" fields for now (things like Gmail's
// "Custom Scopes" toggle): they're an advanced opt-in path (custom OAuth scopes) that isn't
// needed for a normal connect, and sending them as plain strings risks n8n's own expression
// evaluator treating the literal text "false" as truthy. Simplest safe choice is to omit them
// entirely and let n8n apply its own default (proven to work correctly for Gmail already).
function visibleFields(option: AuthOption) {
  return option.fields.filter((f) => f.type !== "hidden" && f.type !== "boolean");
}

export function IntegrationModal({ integration, open, onOpenChange, onSaved }: IntegrationModalProps) {
  const { token } = useAuth();
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset local form state whenever a different integration is opened, and default to the
  // catalog's recommended option (simplest non-OAuth method where one exists).
  useEffect(() => {
    if (integration) {
      const opt =
        integration.auth_options.find((o) => o.option_id === integration.default_option) ??
        integration.auth_options[0];
      setSelectedOptionId(opt.option_id);
      // Pre-fill any field that has a known default (e.g. GitHub's "server" ->
      // https://api.github.com, Salesforce's "environment" -> production) so the user can
      // just hit Connect for the common case instead of retyping n8n's own defaults.
      const prefill: Record<string, string> = {};
      for (const f of visibleFields(opt)) {
        if (f.default) prefill[f.name] = f.default;
      }
      setValues(prefill);
      setClientId("");
      setClientSecret("");
    }
  }, [integration]);

  if (!integration) return null;

  const selectedOption =
    integration.auth_options.find((o) => o.option_id === selectedOptionId) ??
    integration.auth_options[0];

  const isTextFields = selectedOption.connection_pattern === 1;
  const isOAuth = selectedOption.connection_pattern === 2 || selectedOption.connection_pattern === 4;
  const oauthExtraFields = isOAuth ? visibleFields(selectedOption) : [];

  const handleSaveTextFields = async () => {
    const fields = visibleFields(selectedOption);
    const missing = fields.filter((f) => !values[f.name]?.trim());
    if (missing.length > 0) {
      toast.error("Please fill in all fields");
      return;
    }
    setSaving(true);
    try {
      await connectTextFields(token, integration.service, selectedOption.option_id, values);
      toast.success(`Connected to ${integration.display_name}`);
      onSaved(integration.service);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save integration");
    } finally {
      setSaving(false);
    }
  };

  const handleOAuthConnect = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Client ID and Client Secret are required");
      return;
    }
    // Extra fields (server URL, environment, custom scopes, ...) are always optional here --
    // omitting them lets n8n apply its own built-in defaults, which we've confirmed works
    // correctly. Only send whatever the user actually filled in (including pre-filled defaults
    // left as-is).
    setSaving(true);
    try {
      const extraFields: Record<string, string> = {};
      for (const f of oauthExtraFields) {
        if (values[f.name]?.trim()) extraFields[f.name] = values[f.name];
      }
      const { authorization_url } = await connectOAuthInit(
        token,
        integration.service,
        selectedOption.option_id,
        clientId,
        clientSecret,
        extraFields
      );
      toast.info(`Complete the ${integration.display_name} sign-in in the popup window`);
      const connected = await runOAuthPopupFlow(token, integration.service, authorization_url);
      if (connected) {
        toast.success(`Connected to ${integration.display_name}`);
        onSaved(integration.service);
        onOpenChange(false);
      } else {
        toast.error("Connection window closed before finishing");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect");
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

        <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto">
          {integration.auth_options.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-option">Connection method</Label>
              <select
                id="auth-option"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={selectedOption.option_id}
                onChange={(e) => {
                  const opt = integration.auth_options.find((o) => o.option_id === e.target.value)!;
                  setSelectedOptionId(opt.option_id);
                  const prefill: Record<string, string> = {};
                  for (const f of visibleFields(opt)) {
                    if (f.default) prefill[f.name] = f.default;
                  }
                  setValues(prefill);
                }}
              >
                {integration.auth_options.map((opt) => (
                  <option key={opt.option_id} value={opt.option_id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isTextFields &&
            visibleFields(selectedOption).map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name}>{field.display_name ?? field.name}</Label>
                <Input
                  id={field.name}
                  type={field.secret ? "password" : "text"}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  placeholder={field.default ?? field.display_name ?? field.name}
                />
              </div>
            ))}

          {isOAuth && (
            <>
              <p className="text-sm text-muted-foreground">
                Register your own {integration.display_name} OAuth app and enter its credentials
                below. Use this redirect URI when registering it:
                <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                  http://localhost:5678/rest/oauth2-credential/callback
                </code>
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="client-id">Client ID</Label>
                <Input id="client-id" value={clientId} onChange={(e) => setClientId(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-secret">Client Secret</Label>
                <Input
                  id="client-secret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                />
              </div>
              {oauthExtraFields.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Optional advanced settings -- leave blank to use {integration.display_name}'s
                  defaults.
                </p>
              )}
              {oauthExtraFields.map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={field.name}>{field.display_name ?? field.name}</Label>
                  <Input
                    id={field.name}
                    type={field.secret ? "password" : "text"}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.default ?? field.display_name ?? field.name}
                  />
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          {isTextFields && (
            <Button onClick={handleSaveTextFields} disabled={saving}>
              {saving ? "Saving..." : "Save & Connect"}
            </Button>
          )}
          {isOAuth && (
            <Button onClick={handleOAuthConnect} disabled={saving}>
              {saving ? "Connecting..." : "Connect"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}