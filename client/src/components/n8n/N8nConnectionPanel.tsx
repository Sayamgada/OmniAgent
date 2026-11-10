import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { useAuth } from "../../context/AuthContext";
import { useN8n } from "../../context/N8nContext";
import { disconnectN8n } from "../../lib/api/n8n";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { CopyableUrl } from "./CopyableUrl";

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export function N8nConnectionPanel() {
  const { token } = useAuth();
  const { status, loading, requestConnection, applyStatus } = useN8n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      applyStatus(await disconnectN8n(token));
      toast.success("n8n disconnected");
      setConfirmOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to disconnect n8n",
      );
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card space-y-6 rounded-2xl p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">n8n connection</h3>
          <p className="text-sm text-muted-foreground">
            The n8n instance your integrations and agents are deployed to.
          </p>
        </div>
        {status && (
          <Badge
            variant="outline"
            className={
              status.configured
                ? "border-secondary/40 bg-secondary/10 text-secondary"
                : "border-muted-foreground/30 text-muted-foreground"
            }
          >
            {status.configured ? "Connected" : "Not connected"}
          </Badge>
        )}
      </div>

      {!status ? (
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Loading connection…"
            : "Could not load your n8n connection."}
        </p>
      ) : !status.configured ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You have not connected an n8n instance yet. You need one before you
            can connect integrations or deploy agents.
          </p>
          <Button onClick={() => void requestConnection()}>Connect n8n</Button>
        </div>
      ) : (
        <div className="space-y-5">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Base URL
              </dt>
              <dd className="mt-0.5 break-all font-medium">
                {status.base_url}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Account
              </dt>
              <dd className="mt-0.5 break-all font-medium">{status.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Connected
              </dt>
              <dd className="mt-0.5 font-medium">
                {formatDate(status.connected_at)}
              </dd>
            </div>
          </dl>

          {status.oauth_callback_url && (
            <div className="space-y-2">
              <p className="text-sm font-medium">OAuth redirect URI</p>
              <p className="text-xs text-muted-foreground">
                Register this in your Google, GitHub or other OAuth app when you
                connect an OAuth integration.
              </p>
              <CopyableUrl value={status.oauth_callback_url} />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void requestConnection()}>
              Update connection
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              Disconnect
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Disconnect n8n?"
        description="OmniAgent forgets this connection. Nothing is deleted in n8n, but your saved integrations and agents are marked stale until you connect again."
        confirmLabel="Disconnect"
        destructive
        loading={disconnecting}
        onConfirm={handleDisconnect}
      />
    </motion.div>
  );
}
