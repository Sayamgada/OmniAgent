import { Bot, Layers, Plug, Route } from "lucide-react";

interface WorkflowMetricsBarProps {
  complexity: string;
  agentCount: number;
  toolCount: number;
  stepCount: number;
}

export const WorkflowMetricsBar = ({
  complexity,
  agentCount,
  toolCount,
  stepCount,
}: WorkflowMetricsBarProps) => {
  const items = [
    { label: "Complexity", value: complexity, icon: Layers },
    { label: "Agents", value: agentCount, icon: Bot },
    { label: "APIs", value: toolCount, icon: Plug },
    { label: "Steps", value: stepCount, icon: Route },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold capitalize text-foreground">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
