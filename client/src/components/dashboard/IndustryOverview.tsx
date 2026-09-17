import { motion } from "framer-motion";
import { Cell, Pie, PieChart } from "recharts";
import { TrendingUp, Layers, CheckCircle2, Zap } from "lucide-react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { industryStats } from "../../lib/dashboard-data";

const chartConfig = {
  corporate: { label: "Corporate", color: "hsl(217 100% 56%)" },
  education: { label: "Education", color: "hsl(270 70% 60%)" },
  finance: { label: "Finance", color: "hsl(160 84% 42%)" },
};

export function IndustryOverview() {
  const chartData = industryStats.map((item) => ({
    name: item.id,
    value: item.percentage,
    fill: item.color,
  }));

  const totalAgents = industryStats.reduce((acc, curr) => acc + curr.agents, 0);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Industry Domain Workload Distribution</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active agent allocation and compute density across operational domains
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Load Balanced
          </span>
          <span>·</span>
          <span>{totalAgents} Total Fleet Units</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-center">
        {/* Donut Chart with Center Label */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[210px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={88}
                strokeWidth={3}
                stroke="hsl(var(--card))"
                paddingAngle={4}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-2xl font-extrabold text-foreground">100%</span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Allocated</span>
          </div>
        </div>

        {/* Detailed Industry Bars & Breakdown */}
        <div className="lg:col-span-7 space-y-4">
          {industryStats.map((industry, i) => (
            <motion.div
              key={industry.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/80 bg-background/40 p-3.5 space-y-2 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full shadow-sm"
                    style={{ backgroundColor: industry.color }}
                  />
                  <span className="font-bold text-foreground">{industry.label}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-foreground font-semibold">{industry.agents} agents ({industry.percentage}%)</span>
                  <span className="flex items-center gap-0.5 text-secondary font-medium">
                    <TrendingUp className="size-3" />
                    +{industry.trend}%
                  </span>
                </div>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: industry.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${industry.percentage}%` }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.6 }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-0.5">
                <span>Deterministic IR Guardrails Active</span>
                <span>Audit Verified</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
