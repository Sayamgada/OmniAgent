import { motion } from "framer-motion";
import { Bot, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart } from "recharts";

import { Button } from "../ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { Skeleton } from "../ui/skeleton";
import type { AgentStatusBucket } from "../../lib/api/dashboard";

const STATUS_META: Record<
  AgentStatusBucket,
  { label: string; color: string; hint: string }
> = {
  active: {
    label: "Active",
    color: "hsl(122 39% 49%)",
    hint: "Running in n8n",
  },
  inactive: {
    label: "Inactive",
    color: "hsl(215 16% 57%)",
    hint: "Switched off, can be reactivated",
  },
  created: {
    label: "Not activated",
    color: "hsl(211 100% 50%)",
    hint: "Deployed but never activated",
  },
  failed: {
    label: "Failed",
    color: "hsl(0 72% 55%)",
    hint: "n8n rejected creation or activation",
  },
  missing: {
    label: "Missing",
    color: "hsl(32 95% 55%)",
    hint: "Deleted in n8n outside OmniAgent",
  },
  stale: {
    label: "Stale",
    color: "hsl(270 70% 60%)",
    hint: "From a previous n8n connection",
  },
};

const ORDER: AgentStatusBucket[] = [
  "active",
  "inactive",
  "created",
  "failed",
  "missing",
  "stale",
];

const chartConfig = Object.fromEntries(
  ORDER.map((k) => [k, { label: STATUS_META[k].label, color: STATUS_META[k].color }]),
);

type Props = {
  byStatus: Record<AgentStatusBucket, number> | null;
  loading?: boolean;
};

export function AgentStatusOverview({ byStatus, loading }: Props) {
  const total = byStatus ? ORDER.reduce((n, k) => n + byStatus[k], 0) : 0;
  const rows = byStatus
    ? ORDER.filter((k) => byStatus[k] > 0).map((k) => ({
        id: k,
        count: byStatus[k],
        percentage: total ? Math.round((byStatus[k] * 100) / total) : 0,
        ...STATUS_META[k],
      }))
    : [];

  return (
    <motion.div className="glass-card rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Agent Health</h3>
        <p className="text-sm text-muted-foreground">
          Your agents by current status
        </p>
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="mx-auto h-[180px] w-[180px] rounded-full" />
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            No agents yet. Create one to see its status here.
          </p>
          <Button asChild size="sm" className="gap-2">
            <Link to="/new-agent">
              <Plus className="h-4 w-4" />
              Create Agent
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-[220px] w-[220px]"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={rows.map((r) => ({ name: r.id, value: r.count, fill: r.color }))}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="90%"
                paddingAngle={rows.length > 1 ? 2 : 0}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {rows.map((r) => (
                  <Cell key={r.id} fill={r.color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <motion.div className="space-y-4">
            {rows.map((row, i) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="font-medium">{row.label}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {row.count} {row.count === 1 ? "agent" : "agents"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: row.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${row.percentage}%` }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.percentage}% of agents · {row.hint}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
