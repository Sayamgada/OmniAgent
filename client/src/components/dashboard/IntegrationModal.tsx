import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";

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

  useEffect(() => {
    if (integration) {
      const opt =
        integration.auth_options.find((o) => o.option_id === integration.default_option) ??
        integration.auth_options[0];
      setSelectedOptionId(opt.option_id);
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
      toast.error("Please fill in all required fields");
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
      toast.info(`Complete authorization in the popup window`);
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
      <DialogContent className="border-border bg-card max-w-lg text-left">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
              <Shield className="size-3.5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Connect {integration.display_name}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {integration.auth_options.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-option" className="text-xs font-semibold text-foreground">
                Authentication Method
              </Label>
              <select
                id="auth-option"
                className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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
                  <option key={opt.option_id} value={opt.option_id} className="bg-card text-foreground">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isTextFields &&
            visibleFields(selectedOption).map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name} className="text-xs font-medium text-foreground">
                  {field.display_name ?? field.name}
                </Label>
                <Input
                  id={field.name}
                  type={field.secret ? "password" : "text"}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  placeholder={field.default ?? field.display_name ?? field.name}
                  className="h-9 border-border bg-background/50 text-xs"
                />
              </div>
            ))}

          {isOAuth && (
            <>
              <div className="rounded-lg border border-border bg-background/40 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Register an OAuth app with {integration.display_name} using this redirect URI:
                </p>
                <code className="block font-mono text-[11px] text-primary break-all bg-card/80 p-1.5 rounded border border-border/60">
                  http://localhost:5678/rest/oauth2-credential/callback
                </code>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-id" className="text-xs font-medium text-foreground">Client ID</Label>
                <Input
                  id="client-id"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="h-9 border-border bg-background/50 text-xs font-mono"
                  placeholder="Paste OAuth Client ID"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-secret" className="text-xs font-medium text-foreground">Client Secret</Label>
                <Input
                  id="client-secret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="h-9 border-border bg-background/50 text-xs font-mono"
                  placeholder="••••••••••••••••"
                />
              </div>
              {oauthExtraFields.length > 0 && (
                <p className="font-mono text-[10px] text-muted-foreground">
                  Optional advanced parameters — leave empty to apply defaults.
                </p>
              )}
              {oauthExtraFields.map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-xs font-medium text-foreground">
                    {field.display_name ?? field.name}
                  </Label>
                  <Input
                    id={field.name}
                    type={field.secret ? "password" : "text"}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.default ?? field.display_name ?? field.name}
                    className="h-9 border-border bg-background/50 text-xs"
                  />
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 pt-3 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-8 text-xs text-muted-foreground"
          >
            Cancel
          </Button>
          {isTextFields && (
            <Button
              size="sm"
              onClick={handleSaveTextFields}
              disabled={saving}
              className="h-8 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                  Saving…
                </>
              ) : (
                "Save & Connect"
              )}
            </Button>
          )}
          {isOAuth && (
            <Button
              size="sm"
              onClick={handleOAuthConnect}
              disabled={saving}
              className="h-8 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                  Connecting…
                </>
              ) : (
                "Launch OAuth Flow"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}