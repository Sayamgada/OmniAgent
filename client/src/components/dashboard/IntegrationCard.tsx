import { motion } from "framer-motion";
import { Key, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { Integration } from "../../lib/dashboard-data";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { cn } from "../../lib/utils";

const integrationIcons: Record<string, string> = {
  gmail: "📧",
  calendar: "📅",
  slack: "💬",
  notion: "📝",
  openai: "🤖",
  anthropic: "🧠",
};

type IntegrationCardProps = {
  integration: Integration;
  index?: number;
};

export function IntegrationCard({ integration, index = 0 }: IntegrationCardProps) {
  const [connected, setConnected] = useState(integration.connected);

  const toggleConnection = () => {
    setConnected((prev) => !prev);
    toast.success(
      connected
        ? `Disconnected from ${integration.name}`
        : `Connected to ${integration.name}`
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className={cn(
        "glass-card-hover rounded-2xl p-5 transition-all duration-300",
        connected && "border-primary/20 shadow-[0_0_24px_hsl(211_100%_50%_/_0.12)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
            {integrationIcons[integration.id] ?? "🔗"}
          </div>
          <div>
            <h3 className="font-semibold">{integration.name}</h3>
            <p className="text-xs text-muted-foreground">{integration.category}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            connected
              ? "border-secondary/40 bg-secondary/10 text-secondary"
              : "border-muted-foreground/30 text-muted-foreground"
          )}
        >
          {connected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{integration.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Key className="h-3.5 w-3.5" />
          API Keys
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Permissions
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {connected ? "On" : "Off"}
          </span>
          <Switch checked={connected} onCheckedChange={toggleConnection} />
        </div>
      </div>
    </motion.div>
  );
}
