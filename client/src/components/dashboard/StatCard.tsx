import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";

import { AnimatedCounter } from "./AnimatedCounter";
import type { StatItem } from "../../lib/dashboard-data";
import { cn } from "../../lib/utils";

type StatCardProps = {
  stat: StatItem;
  index?: number;
};

export function StatCard({ stat, index = 0 }: StatCardProps) {
  const Icon = stat.icon;
  const isPositive = stat.trend >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center justify-between">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
          <Icon className="size-4" />
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium",
            isPositive ? "bg-secondary/10 text-secondary border border-secondary/30" : "bg-destructive/10 text-destructive border border-destructive/30"
          )}
        >
          {isPositive ? (
            <TrendingUp className="size-3" />
          ) : (
            <TrendingDown className="size-3" />
          )}
          {Math.abs(stat.trend)}%
        </div>
      </div>
      <p className="mt-3 text-xl font-bold tracking-tight text-foreground font-mono">
        <AnimatedCounter
          value={stat.value}
          decimals={stat.suffix === "%" && stat.value < 100 ? 1 : 0}
          suffix={stat.suffix}
        />
      </p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground truncate">{stat.label}</p>
      <p className="text-[10px] text-muted-foreground/70">{stat.trendLabel}</p>
    </motion.div>
  );
}
