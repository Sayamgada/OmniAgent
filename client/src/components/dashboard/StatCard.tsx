import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { AnimatedCounter } from "./AnimatedCounter";
import { Skeleton } from "../ui/skeleton";
import { cn } from "../../lib/utils";

export type StatTone = "positive" | "negative" | "neutral";

export type StatItem = {
  id: string;
  label: string;
  /** null renders as an em dash (no data yet / not available) */
  value: number | null;
  suffix?: string;
  decimals?: number;
  /** small pill in the top-right corner */
  badge?: { text: string; tone: StatTone };
  hint: string;
  icon: LucideIcon;
};

type StatCardProps = {
  stat: StatItem;
  index?: number;
};

const toneClass: Record<StatTone, string> = {
  positive: "bg-secondary/15 text-secondary",
  negative: "bg-destructive/15 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function StatCard({ stat, index = 0 }: StatCardProps) {
  const Icon = stat.icon;

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
        {stat.badge && (
          <div
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              toneClass[stat.badge.tone],
            )}
          >
            {stat.badge.text}
          </div>
        )}
      </motion.div>
      <p className="mt-4 text-2xl font-bold tracking-tight">
        {stat.value === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <AnimatedCounter
            value={stat.value}
            decimals={stat.decimals ?? 0}
            suffix={stat.suffix}
          />
        )}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground/70">{stat.hint}</p>
    </motion.div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="mt-4 h-7 w-16" />
      <Skeleton className="mt-2 h-4 w-28" />
      <Skeleton className="mt-1.5 h-3 w-20" />
    </div>
  );
}
