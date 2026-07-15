import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

import type { PipelineNode, PipelineNodeChange } from "../../lib/edit-agent-data";
import { cn } from "../../lib/utils";

type WorkflowPipelinePreviewProps = {
  nodes: PipelineNode[];
  label?: string;
  version?: string;
  showLegend?: boolean;
  className?: string;
};

const changeStyles: Record<
  PipelineNodeChange,
  { border: string; glow: string; badge: string; badgeText: string }
> = {
  unchanged: {
    border: "border-white/[0.08]",
    glow: "",
    badge: "",
    badgeText: "",
  },
  added: {
    border: "border-secondary/50",
    glow: "shadow-[0_0_20px_rgba(34,197,94,0.2)]",
    badge: "bg-secondary/15 text-secondary border-secondary/30",
    badgeText: "New",
  },
  removed: {
    border: "border-red-500/50",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.18)] opacity-60",
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    badgeText: "Removed",
  },
  modified: {
    border: "border-primary/50",
    glow: "shadow-[0_0_20px_rgba(29,143,255,0.25)]",
    badge: "bg-primary/15 text-primary border-primary/30",
    badgeText: "Modified",
  },
};

export function WorkflowPipelinePreview({
  nodes,
  label,
  version,
  showLegend = false,
  className,
}: WorkflowPipelinePreviewProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(label || version) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {label && (
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          )}
          {version && (
            <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Version {version}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-0 py-2">
        {nodes.map((node, index) => {
          const change = node.change ?? "unchanged";
          const styles = changeStyles[change];

          return (
            <div key={`${node.id}-${index}`} className="flex w-full max-w-xs flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.28 }}
                className={cn(
                  "relative w-full rounded-2xl border bg-[#1E1E1E]/95 px-4 py-3.5 text-center backdrop-blur-sm",
                  styles.border,
                  styles.glow
                )}
              >
                <p className="text-sm font-medium text-foreground">{node.label}</p>
                {styles.badgeText && (
                  <span
                    className={cn(
                      "absolute -right-2 -top-2 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                      styles.badge
                    )}
                  >
                    {styles.badgeText}
                  </span>
                )}
              </motion.div>

              {index < nodes.length - 1 && (
                <div className="relative flex h-8 w-px flex-col items-center justify-center">
                  <motion.div
                    className="absolute inset-0 w-px bg-gradient-to-b from-primary/60 via-primary to-primary/40"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_rgba(29,143,255,0.8)]"
                    animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <ArrowDown className="relative z-10 size-3.5 text-primary/80" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/[0.06] pt-4 text-[11px] text-muted-foreground">
          <LegendDot className="bg-secondary" label="New nodes" />
          <LegendDot className="bg-red-500" label="Removed nodes" />
          <LegendDot className="bg-primary" label="Modified nodes" />
        </div>
      )}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
    </span>
  );
}
