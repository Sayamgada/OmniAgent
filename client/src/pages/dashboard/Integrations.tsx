import { motion } from "framer-motion";
import { Plug } from "lucide-react";

import { IntegrationCard } from "../../components/dashboard/IntegrationCard";
import { integrations } from "../../lib/dashboard-data";

export default function Integrations() {
  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect external platforms to power your AI agents
        </p>
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
            {connectedCount} of {integrations.length} integrations connected
          </p>
          <p className="text-sm text-muted-foreground">
            Connect more services to unlock advanced agent capabilities
          </p>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration, i) => (
          <IntegrationCard key={integration.id} integration={integration} index={i} />
        ))}
      </div>
    </div>
  );
}
