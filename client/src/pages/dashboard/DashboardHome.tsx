import { format } from "date-fns";
import {
  Plus,
  Upload,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";

import { IndustryOverview } from "../../components/dashboard/IndustryOverview";
import { StatCard } from "../../components/dashboard/StatCard";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { dashboardStats } from "../../lib/dashboard-data";

export default function DashboardHome() {
  const { user } = useAuth();
  const now = new Date();

  const displayName =
    user?.full_name ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <div className="space-y-6 text-left">
      <section className="relative overflow-hidden rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {format(now, "EEEE, MMMM d, yyyy")}
            </p>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Welcome back, <span className="gradient-text">{displayName}</span>
            </h1>
            <p className="mt-1 text-xs text-muted-foreground max-w-xl">
              Workspace running <span className="font-semibold text-foreground font-mono">8 active agents</span> across <span className="font-semibold text-foreground font-mono">3 industry domains</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" asChild className="h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary">
              <Link to="/new-agent">
                <Plus className="size-3.5" />
                Create Agent
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild className="h-9 gap-1.5 border-border bg-background/50 text-xs text-foreground hover:bg-card">
              <Link to="/integrations">
                <Upload className="size-3.5" />
                Integrations
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild className="h-9 gap-1.5 border-border bg-background/50 text-xs text-foreground hover:bg-card">
              <Link to="/agents">
                <Workflow className="size-3.5" />
                My Agents
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold text-foreground">Workspace Metrics</h2>
          <span className="font-mono text-[10px] text-muted-foreground">Updated real-time</span>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {dashboardStats.map((stat, i) => (
            <StatCard key={stat.id} stat={stat} index={i} />
          ))}
        </div>
      </section>

      <IndustryOverview />
    </div>
  );
}
