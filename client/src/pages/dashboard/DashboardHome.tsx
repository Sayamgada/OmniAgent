import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  BarChart3,
  Bot,
  MessageSquare,
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

const quickActions = [
  {
    label: "Create New Agent",
    description: "Build a custom AI agent",
    icon: Bot,
    to: "/new-agent",
    accent: "from-primary/20 to-primary/5",
  },
  {
    label: "Upload Files",
    description: "Index knowledge documents",
    icon: Upload,
    to: "/integrations",
    accent: "from-purple-500/20 to-purple-500/5",
  },
  {
    label: "Start Workflow",
    description: "Automate multi-step tasks",
    icon: Workflow,
    to: "/agents",
    accent: "from-secondary/20 to-secondary/5",
  },
  {
    label: "Open AI Chat",
    description: "Talk to your agents",
    icon: MessageSquare,
    to: "/new-agent",
    accent: "from-primary/20 to-purple-500/10",
  },
  {
    label: "View Analytics",
    description: "Insights & performance",
    icon: BarChart3,
    to: "/dashboard",
    accent: "from-purple-500/20 to-primary/10",
  },
] as const;

export default function DashboardHome() {
  const { user } = useAuth();
  const now = new Date();

  const displayName =
    user?.full_name ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "there";

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
            You currently have{" "}
            <span className="font-medium text-foreground">8 active agents</span>{" "}
            across{" "}
            <span className="font-medium text-foreground">3 industries</span>.
            Your AI workspace is operating at peak efficiency.
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
        <h2 className="mb-4 text-lg font-semibold">Quick Stats</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {dashboardStats.map((stat, i) => (
            <StatCard key={stat.id} stat={stat} index={i} />
          ))}
        </div>
      </section>

      <IndustryOverview />

      <section>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={action.to}
                  className={`glass-card-hover group flex flex-col rounded-2xl border border-border/50 bg-gradient-to-br ${action.accent} p-5 transition-all duration-300 hover:-translate-y-0.5`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/50 text-primary transition-shadow group-hover:shadow-[0_0_20px_hsl(211_100%_50%_/_0.2)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{action.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
