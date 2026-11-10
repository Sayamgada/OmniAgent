import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../../context/AuthContext";
import { connectN8n, type N8nStatus } from "../../lib/api/n8n";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type ConnectN8nModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (status: N8nStatus) => void;
  /** Current connection, used to prefill the URL and email when reconnecting. */
  existing: N8nStatus | null;
};

const sameInstance = (a: string, b: string) =>
  a.trim().replace(/\/+$/, "").toLowerCase() ===
  b.trim().replace(/\/+$/, "").toLowerCase();

export function ConnectN8nModal({
  open,
  onOpenChange,
  onConnected,
  existing,
}: ConnectN8nModalProps) {
  const { token } = useAuth();
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh form each time it opens; secrets are never prefilled.
  useEffect(() => {
    if (!open) return;
    setBaseUrl(existing?.base_url ?? "");
    setEmail(existing?.email ?? "");
    setApiKey("");
    setPassword("");
    setError(null);
  }, [open, existing?.base_url, existing?.email]);

  const switchingInstance =
    !!existing?.configured &&
    !!existing.base_url &&
    baseUrl.trim() !== "" &&
    !sameInstance(baseUrl, existing.base_url);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (![baseUrl, apiKey, email, password].every((v) => v.trim())) {
      setError("Fill in all four fields.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await connectN8n(token, {
        base_url: baseUrl.trim(),
        api_key: apiKey.trim(),
        email: email.trim(),
        password,
      });
      toast.success("n8n connected");
      onConnected(next);
    } catch (err) {
      // The backend's 400 messages are written for the end user, so show them as-is.
      setError(
        err instanceof Error ? err.message : "Could not connect to n8n.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {existing?.configured
              ? "Update your n8n connection"
              : "Connect your n8n"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            OmniAgent deploys your agents to your own n8n instance. Find the API
            key in n8n under Settings, n8n API, and use the email and password
            you sign in to n8n with.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="n8n-base-url">n8n base URL</Label>
            <Input
              id="n8n-base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://n8n.example.com"
              autoComplete="off"
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n8n-api-key">API key</Label>
            <Input
              id="n8n-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              disabled={saving}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="n8n-email">n8n email</Label>
              <Input
                id="n8n-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n8n-password">n8n password</Label>
              <Input
                id="n8n-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={saving}
              />
            </div>
          </div>

          {switchingInstance && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-500">
              This is a different n8n instance. Integrations and agents saved
              for your current n8n will be marked stale until you reconnect them
              here.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : existing?.configured ? (
                "Save connection"
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
