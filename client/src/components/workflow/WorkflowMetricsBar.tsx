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
    { label: "APIs & Tools", value: toolCount, icon: Plug },
    { label: "Steps", value: stepCount, icon: Route },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex items-center gap-2.5 rounded-lg border border-border bg-card/70 px-3 py-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 border border-primary/20 text-primary">
            <Icon className="size-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground truncate">{label}</p>
            <p className="text-xs font-bold capitalize text-foreground font-mono">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
