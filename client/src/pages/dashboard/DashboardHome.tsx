import { format } from "date-fns";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Cpu,
  Layers,
  MessageSquare,
  Play,
  Plug,
  Plus,
  ShieldCheck,
  Sparkles,
  Upload,
  Workflow,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { IndustryOverview } from "../../components/dashboard/IndustryOverview";
import { StatCard } from "../../components/dashboard/StatCard";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../context/AuthContext";
import { dashboardStats, mockAgents, industryLabels } from "../../lib/dashboard-data";

export default function DashboardHome() {
  const { user } = useAuth();
  const now = new Date();

  const displayName =
    user?.full_name ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "Engineer";

  // Primary dominant stats
  const primaryStats = dashboardStats.slice(0, 2);
  // Secondary vital stats
  const secondaryStats = dashboardStats.slice(2);

  return (
    <div className="space-y-6 text-left">
      {/* 1. Command Center Telemetry Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-border/90 bg-card p-6 sm:p-8 backdrop-blur-2xl shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-48 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{format(now, "EEEE, MMMM d, yyyy")}</span>
              <span>·</span>
              <span className="text-primary font-medium">Enterprise Engine Live</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Operational Workspace <span className="gradient-text font-black">Console</span>
            </h1>
            
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Managing <span className="font-mono font-bold text-foreground">8 active agents</span> across{" "}
              <span className="font-mono font-bold text-foreground">3 industry domains</span>. All FastAPI endpoints and n8n webhook nodes operating with nominal latency.
            </p>
          </div>

          {/* Action Ribbon */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button size="sm" asChild className="h-9 gap-1.5 bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg shadow-sm">
              <Link to="/new-agent">
                <Plus className="size-3.5" />
                <span>Create Agent</span>
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild className="h-9 gap-1.5 border-border/80 bg-background/50 px-3.5 text-xs font-medium text-foreground hover:bg-card rounded-lg">
              <Link to="/integrations">
                <Plug className="size-3.5 text-primary" />
                <span>Vault Integrations</span>
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild className="h-9 gap-1.5 border-border/80 bg-background/50 px-3.5 text-xs font-medium text-foreground hover:bg-card rounded-lg">
              <Link to="/agents">
                <Workflow className="size-3.5 text-secondary" />
                <span>Fleet Matrix</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Workspace Metrics Hierarchy */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
              Runtime Telemetry & Quota
            </h2>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">Real-time sync active</span>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {dashboardStats.map((stat, i) => (
            <StatCard
              key={stat.id}
              stat={stat}
              index={i}
              highlight={stat.id === "agents" || stat.id === "success"}
            />
          ))}
        </div>
      </section>

      {/* 3. Industry Domain Workload Distribution */}
      <IndustryOverview />

      {/* 4. Active Fleet Quick Command Console */}
      <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Active Agent Fleet Snapshot</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rapid execution triggers and status monitoring for deployed workers
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs text-primary hover:text-primary/90 gap-1">
            <Link to="/agents">
              <span>View All Fleet Units</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {mockAgents.slice(0, 3).map((agent) => (
            <div
              key={agent.id}
              className="rounded-xl border border-border/80 bg-background/40 p-4 space-y-3 hover:border-primary/40 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-foreground">{agent.name}</h4>
                    <p className="text-[11px] text-muted-foreground">{agent.role}</p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[9px] border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                    Live
                  </Badge>
                </div>

                <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                  <span className="rounded bg-card px-2 py-0.5 border border-border">
                    {industryLabels[agent.industry]}
                  </span>
                  <span>{agent.model}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {agent.conversations} runs
                </span>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" asChild className="h-7 px-2.5 text-[11px] border-border bg-card">
                    <Link to={`/agents/${agent.id}/edit`}>Edit</Link>
                  </Button>
                  <Button size="sm" asChild className="h-7 px-2.5 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link to="/new-agent">
                      <Play className="size-2.5 mr-1" />
                      Run
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
