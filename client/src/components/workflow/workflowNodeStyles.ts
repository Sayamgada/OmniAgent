import type { WorkflowNodeType } from "../../types/workflow";

export const nodeTypeStyles: Record<
  WorkflowNodeType,
  { border: string; glow: string; iconBg: string; badge: string }
> = {
  trigger: {
    border: "border-primary/60",
    glow: "shadow-[0_0_20px_hsl(var(--primary)/0.25)]",
    iconBg: "bg-primary/15 text-primary",
    badge: "bg-primary/15 text-primary border border-primary/30",
  },
  orchestrator: {
    border: "border-violet-500/50",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.2)]",
    iconBg: "bg-violet-500/15 text-violet-400",
    badge: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  },
  agent: {
    border: "border-primary/40",
    glow: "shadow-[0_0_16px_hsl(var(--primary)/0.15)]",
    iconBg: "bg-primary/10 text-primary",
    badge: "bg-primary/10 text-primary border border-primary/20",
  },
  tool: {
    border: "border-amber-500/40",
    glow: "shadow-[0_0_16px_rgba(245,158,11,0.15)]",
    iconBg: "bg-amber-500/15 text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  },
  decision: {
    border: "border-amber-500/40",
    glow: "shadow-[0_0_16px_rgba(245,158,11,0.15)]",
    iconBg: "bg-amber-500/15 text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  },
  approval: {
    border: "border-amber-500/40",
    glow: "shadow-[0_0_16px_rgba(245,158,11,0.15)]",
    iconBg: "bg-amber-500/15 text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  },
  edge_case: {
    border: "border-destructive/50",
    glow: "shadow-[0_0_16px_rgba(239,68,68,0.15)]",
    iconBg: "bg-destructive/15 text-destructive",
    badge: "bg-destructive/10 text-destructive border border-destructive/30",
  },
  success: {
    border: "border-secondary/60",
    glow: "shadow-[0_0_20px_hsl(var(--secondary)/0.25)]",
    iconBg: "bg-secondary/15 text-secondary",
    badge: "bg-secondary/15 text-secondary border border-secondary/30",
  },
  output: {
    border: "border-border",
    glow: "",
    iconBg: "bg-muted text-muted-foreground",
    badge: "bg-muted text-muted-foreground border border-border",
  },
};
