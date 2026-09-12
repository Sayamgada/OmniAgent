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
      <DialogContent className="border-border bg-card max-h-[85vh] max-w-2xl text-left">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">Add Integration</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search integrations by service or category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-9 border-border bg-background/50 text-xs"
          />
        </div>

        <div className="max-h-[50vh] space-y-5 overflow-y-auto pr-1">
          {Object.keys(grouped).length === 0 && (
            <p className="py-8 text-center font-mono text-xs text-muted-foreground">No matching integrations found.</p>
          )}

          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{category}</p>
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
                      className="flex flex-col items-start gap-1 rounded-xl border border-border bg-background/40 p-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-md border border-border bg-card text-primary">
                          <Icon className="size-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-foreground truncate">{item.display_name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground line-clamp-1">
                        {item.auth_options.map((o) => o.label).join(" · ")}
                      </span>
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