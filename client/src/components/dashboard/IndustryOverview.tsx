import { motion } from "framer-motion";
import { Cell, Pie, PieChart } from "recharts";
import { TrendingUp } from "lucide-react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { industryStats } from "../../lib/dashboard-data";

const chartConfig = {
  corporate: { label: "Corporate", color: "hsl(217 100% 50%)" },
  education: { label: "Education", color: "hsl(270 70% 60%)" },
  finance: { label: "Finance", color: "hsl(160 84% 39%)" },
};

export function IndustryOverview() {
  const chartData = industryStats.map((item) => ({
    name: item.id,
    value: item.percentage,
    fill: item.color,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-foreground">Industry Domain Distribution</h3>
        <p className="text-xs text-muted-foreground">
          Proportion of active agents across operational industry contexts
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 items-center">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[190px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={80}
              strokeWidth={2}
              stroke="hsl(var(--card))"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="space-y-3.5">
          {industryStats.map((industry, i) => (
            <motion.div
              key={industry.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: industry.color }}
                  />
                  <span className="font-semibold text-foreground">{industry.label}</span>
                </div>
                <div className="flex items-center gap-2.5 font-mono text-[11px] text-muted-foreground">
                  <span>{industry.agents} agents</span>
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
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground/80 font-mono">{industry.percentage}% of workspace load</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
