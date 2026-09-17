import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Plug, Plus, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

import { IntegrationCard } from "../../components/dashboard/IntegrationCard";
import { IntegrationModal } from "../../components/dashboard/IntegrationModal";
import { IntegrationPickerModal } from "../../components/dashboard/IntegrationPickerModal";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { fetchIntegrations } from "../../lib/api/integrations.ts";
import type { IntegrationCatalogItem } from "../../lib/api/integrations.ts";

export default function Integrations() {  
  const { token } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [configureTarget, setConfigureTarget] = useState<IntegrationCatalogItem | null>(null);
  const [configureOpen, setConfigureOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = () => {
    fetchIntegrations(token)
      .then(setIntegrations)
      .catch((err) => toast.error(err.message || "Failed to load integrations"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const yourIntegrations = integrations.filter((i) => i.configured);
  const addableIntegrations = integrations.filter((i) => !i.configured);
  const connectedCount = yourIntegrations.filter((i) => i.connected).length;

  const openConfigure = (integration: IntegrationCatalogItem) => {
    setConfigureTarget(integration);
    setConfigureOpen(true);
  };

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Encrypted Credential Vault</span>
            <span>·</span>
            <span className="text-emerald-400 font-medium">Per-Tenant Isolation</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Integration <span className="gradient-text">Hub</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Connect external data sources, communication channels, and AI inference providers to your agent ecosystem with zero credential exposure.
          </p>
        </div>

        <Button
          onClick={() => setPickerOpen(true)}
          className="h-9 gap-1.5 bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg self-start sm:self-auto shadow-sm"
        >
          <Plus className="size-3.5" />
          <span>Add Integration</span>
        </Button>
      </div>

      {/* Vault Telemetry Ribbon */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shrink-0">
            <Plug className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              <span className="font-mono text-primary font-bold text-sm">{connectedCount}</span> of <span className="font-mono text-foreground font-bold text-sm">{yourIntegrations.length}</span> active integrations connected
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {integrations.length - yourIntegrations.length} additional services available in ecosystem catalog
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
            className="h-8 gap-1.5 border-border/80 bg-background/50 text-xs font-medium rounded-lg hover:bg-card"
          >
            <Plus className="size-3" />
            <span>Browse Catalog</span>
          </Button>
        </div>
      </motion.div>

      {/* Cards or Empty State */}
      {loading ? (
        <div className="rounded-2xl border border-border/80 bg-card p-12 text-center">
          <p className="font-mono text-xs text-muted-foreground animate-pulse">Loading secure integrations catalog…</p>
        </div>
      ) : yourIntegrations.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
            <Plug className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">No integrations configured yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add integrations to give your agents access to communication channels, storage, and models.
            </p>
          </div>
          <Button
            onClick={() => setPickerOpen(true)}
            className="h-9 gap-1.5 bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg"
          >
            <Plus className="size-3.5" />
            <span>Add First Integration</span>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {yourIntegrations.map((integration, i) => (
            <IntegrationCard
              key={integration.service}
              integration={integration}
              index={i}
              onDeleted={(service) =>
                setIntegrations((prev) =>
                  prev.map((it) =>
                    it.service === service
                      ? { ...it, connected: false, configured: false, connected_option: null }
                      : it
                  )
                )
              }
              onConfigure={openConfigure}
            />
          ))}
        </div>
      )}

      <IntegrationPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        availableIntegrations={addableIntegrations}
        onPick={openConfigure}
      />

      <IntegrationModal
        integration={configureTarget}
        open={configureOpen}
        onOpenChange={setConfigureOpen}
        onSaved={(service) =>
          setIntegrations((prev) =>
            prev.map((it) => (it.service === service ? { ...it, connected: true, configured: true } : it))
          )
        }
      />
    </div>
  );
}