import { motion } from "framer-motion";
import { Cell, Pie, PieChart } from "recharts";
import { TrendingUp } from "lucide-react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { industryStats } from "../../lib/dashboard-data";

const chartConfig = {
  corporate: { label: "Corporate", color: "hsl(211 100% 50%)" },
  education: { label: "Education", color: "hsl(270 70% 60%)" },
  finance: { label: "Finance", color: "hsl(122 39% 49%)" },
};

export function IndustryOverview() {
  const chartData = industryStats.map((item) => ({
    name: item.id,
    value: item.percentage,
    fill: item.color,
  }));

  return (
    <motion.div className="glass-card rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Industry Overview</h3>
        <p className="text-sm text-muted-foreground">
          Agent distribution across industries
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[220px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              strokeWidth={2}
              stroke="hsl(var(--background))"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <motion.div className="space-y-4">
          {industryStats.map((industry, i) => (
            <motion.div
              key={industry.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: industry.color }}
                  />
                  <span className="font-medium">{industry.label}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{industry.agents} agents</span>
                  <span className="flex items-center gap-0.5 text-xs text-secondary">
                    <TrendingUp className="h-3 w-3" />
                    +{industry.trend}%
                  </span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: industry.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${industry.percentage}%` }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{industry.percentage}% of total usage</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
