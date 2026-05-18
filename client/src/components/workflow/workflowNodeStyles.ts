import type { WorkflowNodeType } from "../../types/workflow";

export const nodeTypeStyles: Record<
  WorkflowNodeType,
  { border: string; glow: string; iconBg: string; badge: string }
> = {
  trigger: {
    border: "border-primary/60",
    glow: "shadow-[0_0_20px_rgba(0,123,255,0.25)]",
    iconBg: "bg-primary/20 text-primary",
    badge: "bg-primary/15 text-primary",
  },
  orchestrator: {
    border: "border-violet-500/50",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.2)]",
    iconBg: "bg-violet-500/20 text-violet-400",
    badge: "bg-violet-500/15 text-violet-400",
  },
  agent: {
    border: "border-primary/40",
    glow: "shadow-[0_0_16px_rgba(0,123,255,0.15)]",
    iconBg: "bg-primary/15 text-primary",
    badge: "bg-primary/10 text-primary",
  },
  tool: {
    border: "border-amber-500/40",
    glow: "shadow-[0_0_16px_rgba(245,158,11,0.15)]",
    iconBg: "bg-amber-500/15 text-amber-400",
    badge: "bg-amber-500/10 text-amber-400",
  },
  decision: {
    border: "border-yellow-500/40",
    glow: "shadow-[0_0_16px_rgba(234,179,8,0.15)]",
    iconBg: "bg-yellow-500/15 text-yellow-400",
    badge: "bg-yellow-500/10 text-yellow-400",
  },
  approval: {
    border: "border-orange-500/40",
    glow: "shadow-[0_0_16px_rgba(249,115,22,0.15)]",
    iconBg: "bg-orange-500/15 text-orange-400",
    badge: "bg-orange-500/10 text-orange-400",
  },
  edge_case: {
    border: "border-red-500/40",
    glow: "shadow-[0_0_16px_rgba(239,68,68,0.15)]",
    iconBg: "bg-red-500/15 text-red-400",
    badge: "bg-red-500/10 text-red-400",
  },
  success: {
    border: "border-secondary/50",
    glow: "shadow-[0_0_20px_rgba(76,175,80,0.2)]",
    iconBg: "bg-secondary/20 text-secondary",
    badge: "bg-secondary/15 text-secondary",
  },
  output: {
    border: "border-border",
    glow: "",
    iconBg: "bg-muted text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
};
