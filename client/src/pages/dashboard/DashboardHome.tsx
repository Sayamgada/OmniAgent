import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  PlayCircle,
  Plug,
  Plus,
  Power,
  RefreshCw,
  Upload,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";

import { AgentStatusOverview } from "../../components/dashboard/AgentStatusOverview";
import {
  StatCard,
  StatCardSkeleton,
  type StatItem,
} from "../../components/dashboard/StatCard";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { useN8n } from "../../context/N8nContext";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../../lib/api/dashboard";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function buildStats(s: DashboardSummary): StatItem[] {
  const { agents, integrations, runs } = s;
  const runsUnavailable = s.n8n_connected
    ? "Couldn't reach n8n"
    : "Connect n8n to see runs";
  const finished = runs.succeeded + runs.failed;
  const windowLabel = `last ${runs.window_days} days`;

  return [
    {
      id: "agents",
      label: "Total Agents",
      value: agents.total,
      badge:
        agents.created_this_month > 0
          ? { text: `+${agents.created_this_month} this month`, tone: "positive" }
          : undefined,
      hint: "All agents you've created",
      icon: Bot,
    },
    {
      id: "active",
      label: "Active Agents",
      value: agents.active,
      hint: `of ${agents.total} total`,
      icon: Power,
    },
    {
      id: "integrations",
      label: "Connected Integrations",
      value: integrations.connected,
      badge:
        integrations.pending > 0
          ? { text: `${integrations.pending} pending`, tone: "neutral" }
          : undefined,
      hint: "Services linked to your n8n",
      icon: Plug,
    },
    {
      id: "runs",
      label: "Workflow Runs",
      value: runs.available ? runs.total : null,
      badge:
        runs.available && runs.failed > 0
          ? { text: `${runs.failed} failed`, tone: "negative" }
          : undefined,
      hint: runs.available
        ? runs.partial
          ? `${windowLabel} · some agents unreachable`
          : windowLabel
        : runsUnavailable,
      icon: PlayCircle,
    },
    {
      id: "success",
      label: "Success Rate",
      value: runs.available ? runs.success_rate : null,
      suffix: "%",
      decimals: 1,
      hint: !runs.available
        ? runsUnavailable
        : runs.success_rate === null
          ? `No finished runs, ${windowLabel}`
          : `${runs.succeeded} of ${plural(finished, "run")}, ${windowLabel}`,
      icon: CheckCircle2,
    },
    {
      id: "attention",
      label: "Needs Attention",
      value: agents.needs_attention,
      badge:
        agents.needs_attention > 0
          ? { text: "Review", tone: "negative" }
          : undefined,
      hint:
        agents.needs_attention > 0
          ? "Failed, missing or stale agents"
          : "All agents healthy",
      icon: AlertTriangle,
    },
  ];
}

export default function DashboardHome() {
  const { user, token } = useAuth();
  const { version: n8nVersion } = useN8n();
  const now = new Date();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setSummary(await getDashboardSummary(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, n8nVersion]);

  const displayName =
    user?.full_name ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "there";

  const stats = summary ? buildStats(summary) : [];

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-card/60 to-purple-500/10 p-6 backdrop-blur-xl lg:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-[80px]" />
        <div className="relative">
          <p className="text-sm text-muted-foreground">
            {format(now, "EEEE, MMMM d, yyyy · h:mm a")}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">
            Welcome back, <span className="gradient-text">{displayName}</span>
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {summary ? (
              summary.agents.total === 0 ? (
                <>You don't have any agents yet. Create your first one to get started.</>
              ) : (
                <>
                  You currently have{" "}
                  <span className="font-medium text-foreground">
                    {plural(summary.agents.active, "active agent")}
                  </span>{" "}
                  and{" "}
                  <span className="font-medium text-foreground">
                    {plural(summary.integrations.connected, "connected integration")}
                  </span>
                  .
                  {summary.agents.needs_attention > 0 && (
                    <>
                      {" "}
                      {plural(summary.agents.needs_attention, "agent")}{" "}
                      {summary.agents.needs_attention === 1 ? "needs" : "need"} attention.
                    </>
                  )}
                </>
              )
            ) : (
              <>Here's an overview of your AI workspace.</>
            )}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link to="/new-agent">
                <Plus className="h-4 w-4" />
                Create Agent
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2 border-border/60">
              <Link to="/integrations">
                <Upload className="h-4 w-4" />
                Upload Knowledge
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2 border-border/60">
              <Link to="/agents">
                <Workflow className="h-4 w-4" />
                Start Workflow
              </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quick Stats</h2>
          {summary && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
          )}
        </div>

        {error && !summary ? (
          <div className="glass-card flex flex-col items-center gap-3 rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn't load your dashboard: {error}
            </p>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
            {!summary
              ? Array.from({ length: 6 }, (_, i) => <StatCardSkeleton key={i} />)
              : stats.map((stat, i) => (
                  <StatCard key={stat.id} stat={stat} index={i} />
                ))}
          </div>
        )}
      </section>

      {!(error && !summary) && (
        <AgentStatusOverview
          byStatus={summary?.agents.by_status ?? null}
          loading={!summary}
        />
      )}
    </div>
  );
}
