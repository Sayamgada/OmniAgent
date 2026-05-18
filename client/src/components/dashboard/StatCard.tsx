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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="glass-card-hover group rounded-2xl p-5"
    >
      <motion.div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_hsl(211_100%_50%_/_0.25)]">
          <Icon className="h-5 w-5" />
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            isPositive ? "bg-secondary/15 text-secondary" : "bg-destructive/15 text-destructive"
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {Math.abs(stat.trend)}%
        </div>
      </motion.div>
      <p className="mt-4 text-2xl font-bold tracking-tight">
        <AnimatedCounter
          value={stat.value}
          decimals={stat.suffix === "%" && stat.value < 100 ? 1 : 0}
          suffix={stat.suffix}
        />
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground/70">{stat.trendLabel}</p>
    </motion.div>
  );
}
