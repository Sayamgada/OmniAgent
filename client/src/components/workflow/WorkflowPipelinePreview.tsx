import { motion } from "framer-motion";
import { ArrowDown, Check, GitBranch, Layers, Sparkles } from "lucide-react";

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
  { border: string; bg: string; badge: string; badgeText: string; glow: string }
> = {
  unchanged: {
    border: "border-border/80 hover:border-border",
    bg: "bg-card/90",
    badge: "",
    badgeText: "",
    glow: "",
  },
  added: {
    border: "border-emerald-500/50",
    bg: "bg-emerald-950/20",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    badgeText: "Added",
    glow: "shadow-[0_0_16px_rgba(16,185,129,0.15)]",
  },
  removed: {
    border: "border-destructive/50 opacity-60",
    bg: "bg-destructive/10",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    badgeText: "Removed",
    glow: "shadow-[0_0_16px_rgba(239,68,68,0.15)]",
  },
  modified: {
    border: "border-primary/60",
    bg: "bg-primary/10",
    badge: "bg-primary/15 text-primary border-primary/30",
    badgeText: "Modified",
    glow: "shadow-[0_0_16px_rgba(30,112,255,0.2)]",
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
          {label && (
            <div className="flex items-center gap-2">
              <GitBranch className="size-3.5 text-primary" />
              <p className="text-xs font-bold text-foreground">
                {label}
              </p>
            </div>
          )}
          {version && (
            <span className="font-mono rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] text-muted-foreground font-semibold">
              v{version}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-0 py-2">
        {nodes.map((node, index) => {
          const change = node.change ?? "unchanged";
          const styles = changeStyles[change];

          return (
            <div key={`${node.id}-${index}`} className="flex w-full max-w-sm flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.25 }}
                className={cn(
                  "relative w-full rounded-2xl border p-3.5 text-center transition-all",
                  styles.bg,
                  styles.border,
                  styles.glow
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-background/60 border border-border/80">
                    0{index + 1}
                  </span>
                  <p className="text-xs font-bold text-foreground flex-1 text-center truncate">{node.label}</p>
                  {styles.badgeText ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider border",
                        styles.badge
                      )}
                    >
                      {styles.badgeText}
                    </span>
                  ) : (
                    <span className="w-6" />
                  )}
                </div>
              </motion.div>

              {index < nodes.length - 1 && (
                <div className="relative flex h-6 w-px flex-col items-center justify-center">
                  <div className="absolute inset-0 w-px bg-border" />
                  <div className="relative z-10 flex size-4 items-center justify-center rounded-full bg-background border border-border text-muted-foreground">
                    <ArrowDown className="size-2.5" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center justify-center gap-4 border-t border-border/60 pt-3 font-mono text-[10px] text-muted-foreground">
          <LegendDot className="bg-emerald-500" label="Added Node" />
          <LegendDot className="bg-primary" label="Modified Logic" />
          <LegendDot className="bg-destructive" label="Decommissioned" />
        </div>
      )}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", className)} />
      {label}
    </span>
  );
}
