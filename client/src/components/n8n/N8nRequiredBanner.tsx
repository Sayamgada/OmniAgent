import { Workflow } from "lucide-react";

import { useN8n } from "../../context/N8nContext";
import { Button } from "../ui/button";

/** Shown on pages that depend on n8n when the user has not connected one yet. */
export function N8nRequiredBanner() {
  const { status, requestConnection } = useN8n();
  if (!status || status.configured) return null;

  return (
    <div className="glass-card flex flex-col gap-3 rounded-2xl border border-amber-500/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Workflow className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-medium">Connect your n8n to get started</p>
          <p className="text-xs text-muted-foreground">
            Integrations and agents live on your own n8n instance. Connect it
            once and you are set.
          </p>
        </div>
      </div>
      <Button size="sm" onClick={() => void requestConnection()}>
        Connect n8n
      </Button>
    </div>
  );
}
