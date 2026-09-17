import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";

import { AnimatedCounter } from "./AnimatedCounter";
import type { StatItem } from "../../lib/dashboard-data";
import { cn } from "../../lib/utils";

type StatCardProps = {
  stat: StatItem;
  index?: number;
  highlight?: boolean;
};

export function StatCard({ stat, index = 0, highlight = false }: StatCardProps) {
  const Icon = stat.icon;
  const isPositive = stat.trend >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={cn(
        "group relative rounded-xl border p-4 text-left transition-all duration-200",
        highlight
          ? "border-primary/40 bg-gradient-to-br from-card to-primary/[0.04] shadow-[0_0_24px_hsl(var(--primary)/0.08)]"
          : "border-border/80 bg-card hover:border-primary/40"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/25 text-primary group-hover:scale-105 transition-transform">
          <Icon className="size-4" />
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium border",
            isPositive
              ? "bg-secondary/10 text-secondary border-secondary/30"
              : "bg-destructive/10 text-destructive border-destructive/30"
          )}
        >
          {isPositive ? (
            <TrendingUp className="size-3" />
          ) : (
            <TrendingDown className="size-3" />
          )}
          <span>{isPositive ? "+" : ""}{stat.trend}%</span>
        </div>
      </div>

      <p className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
        <AnimatedCounter
          value={stat.value}
          decimals={stat.suffix === "%" && stat.value < 100 ? 1 : 0}
          suffix={stat.suffix}
        />
      </p>

      <div className="mt-1 flex items-baseline justify-between gap-1">
        <p className="text-xs font-semibold text-foreground/90 truncate">{stat.label}</p>
        <span className="font-mono text-[9px] text-muted-foreground/70 shrink-0">{stat.trendLabel}</span>
      </div>
    </motion.div>
  );
}
