import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Bot,
  Play,
  GitBranch,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Network,
  FileOutput,
} from "lucide-react";

import { cn } from "../../lib/utils";
import type { WorkflowNodeDetail, WorkflowNodeType } from "../../types/workflow";
import { nodeTypeStyles } from "./workflowNodeStyles";

const icons: Record<WorkflowNodeType, typeof Bot> = {
  trigger: Play,
  orchestrator: Network,
  agent: Bot,
  tool: Wrench,
  decision: GitBranch,
  approval: ShieldCheck,
  edge_case: AlertTriangle,
  success: CheckCircle2,
  output: FileOutput,
};

const statusDot: Record<string, string> = {
  ready: "bg-secondary",
  pending: "bg-amber-400",
  warning: "bg-red-400",
};

export type WorkflowNodeData = { detail: WorkflowNodeDetail; highlighted?: boolean };

export const WorkflowNodeCard = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as WorkflowNodeData;
  const detail = nodeData.detail;
  const styles = nodeTypeStyles[detail.type];
  const Icon = icons[detail.type];

  return (
    <div className={cn(
        "group relative w-[240px] rounded-xl border bg-[#1E1E1E]/95 p-3 backdrop-blur-sm transition-all duration-300",
        styles.border,
        (selected || nodeData.highlighted) && styles.glow,
        "hover:shadow-[0_0_24px_rgba(0,123,255,0.18)]"
      )}>
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-primary !bg-background" />
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-primary !bg-background" />

      <div className="mb-2 flex items-start justify-between gap-2">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", styles.iconBg)}>
          <Icon className="size-4" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", statusDot[detail.status ?? "ready"])} />
          <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide", styles.badge)}>
            {detail.type.replace("_", " ")}
          </span>
        </div>
      </div>

      <h4 className="truncate text-sm font-semibold text-foreground">{detail.label}</h4>
      {detail.subtitle && (
        <p className="mt-0.5 truncate text-[11px] text-primary/80">{detail.subtitle}</p>
      )}
      {detail.preview && (
        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
          {detail.preview}
        </p>
      )}
    </div>
  );
});

WorkflowNodeCard.displayName = "WorkflowNodeCard";
