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
          
    </div>
  );
}
