import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import type { IntegrationCatalogItem } from "../../lib/api/integrations.ts";
import { integrationIcons, DefaultIntegrationIcon } from "../../components/dashboard/IntegrationCard";

type IntegrationPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableIntegrations: IntegrationCatalogItem[];
  onPick: (integration: IntegrationCatalogItem) => void;
};

export function IntegrationPickerModal({
  open,
  onOpenChange,
  availableIntegrations,
  onPick,
}: IntegrationPickerModalProps) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const filtered = availableIntegrations.filter(
      (i) =>
        i.display_name.toLowerCase().includes(query.toLowerCase()) ||
        i.category.toLowerCase().includes(query.toLowerCase())
    );
    const byCategory: Record<string, IntegrationCatalogItem[]> = {};
    for (const item of filtered) {
      (byCategory[item.category] ??= []).push(item);
    }
    return byCategory;
  }, [availableIntegrations, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Integration</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search integrations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
          {Object.keys(grouped).length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No matching integrations.</p>
          )}

          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{category}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {items.map((item) => {
                  const Icon = integrationIcons[item.service] ?? DefaultIntegrationIcon;
                  return (
                    <button
                      key={item.service}
                      onClick={() => {
                        onPick(item);
                        onOpenChange(false);
                        setQuery("");
                      }}
                      className="flex flex-col items-start gap-1 rounded-lg border border-border/60 bg-card/50 p-3 text-left transition hover:border-primary/60 hover:bg-primary/10"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{item.display_name}</span>
                      </div>
                      <span className="line-clamp-2 text-xs text-muted-foreground">{item.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}