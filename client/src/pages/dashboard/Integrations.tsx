import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plug, Plus } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connect external platforms to power your AI agents
          </p>
        </div>
        <Button onClick={() => setPickerOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Integration
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card flex items-center gap-4 rounded-2xl p-5"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Plug className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold">
            {connectedCount} of {yourIntegrations.length} added integrations connected
          </p>
          <p className="text-sm text-muted-foreground">
            {integrations.length - yourIntegrations.length} more services available to add
          </p>
        </div>
      </motion.div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading integrations…</p>
      ) : yourIntegrations.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-sm text-muted-foreground">
            You haven't added any integrations yet.
          </p>
          <Button onClick={() => setPickerOpen(true)} className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Add your first integration
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {yourIntegrations.map((integration, i) => (
            <IntegrationCard
              key={integration.service}
              integration={integration}
              index={i}
              onToggled={(service, connected) =>
                setIntegrations((prev) =>
                  prev.map((it) => (it.service === service ? { ...it, connected } : it))
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