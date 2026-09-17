import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  Filter,
  LayoutGrid,
  List,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { AgentCard } from "../../components/dashboard/AgentCard";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { mockAgents, industryLabels } from "../../lib/dashboard-data";
import { cn } from "../../lib/utils";

const industryBadgeStyles: Record<string, string> = {
  corporate: "border-primary/40 bg-primary/10 text-primary",
  education: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  finance: "border-secondary/40 bg-secondary/10 text-secondary",
};

export default function MyAgents() {
  const [view, setView] = useState<"grid" | "matrix">("grid");
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("recent");

  const filtered = useMemo(() => {
    let result = [...mockAgents];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q)
      );
    }

    if (industry !== "all") {
      result = result.filter((a) => a.industry === industry);
    }

    if (status !== "all") {
      result = result.filter((a) => a.status === status);
    }

    if (sort === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "conversations") {
      result.sort((a, b) => b.conversations - a.conversations);
    }

    return result;
  }, [search, industry, status, sort]);

  const totalInvocations = mockAgents.reduce((sum, a) => sum + a.conversations, 0);

  return (
    <div className="space-y-6 text-left">
      {/* 1. Page Header with Overview Telemetry */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Fleet Matrix</span>
            <span>·</span>
            <span className="text-primary font-medium">{mockAgents.length} Active Workers</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            AI Fleet <span className="gradient-text">Command</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
            Inspect, invoke, and configure your specialized domain AI workers with runtime status and model telemetry.
          </p>
        </div>

        <Button size="sm" asChild className="h-9 gap-1.5 bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg self-start sm:self-auto shadow-sm">
          <Link to="/new-agent">
            <Plus className="size-3.5" />
            <span>Create Agent</span>
          </Link>
        </Button>
      </div>

      {/* 2. Search & Command Filter Ribbon */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-3.5 lg:flex-row lg:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents by identity, role, or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-border/80 bg-background/50 pl-9 text-xs focus-visible:ring-primary rounded-lg"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="h-9 w-[135px] border-border/80 bg-background/50 text-xs rounded-lg">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card text-xs">
              <SelectItem value="all">All Industries</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[115px] border-border/80 bg-background/50 text-xs rounded-lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card text-xs">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Standby Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[125px] border-border/80 bg-background/50 text-xs rounded-lg">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card text-xs">
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="conversations">Invocations</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-border/80 bg-background/50 p-0.5">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="size-8 rounded-md"
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <Button
              variant={view === "matrix" ? "secondary" : "ghost"}
              size="icon"
              className="size-8 rounded-md"
              onClick={() => setView("matrix")}
              aria-label="Fleet Matrix view"
            >
              <List className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Empty State or Agents Presentation */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card/80 py-16 px-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30 text-primary mb-3">
            <Bot className="size-6" />
          </div>
          <p className="text-sm font-bold text-foreground">No agents match your filter criteria</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            Try adjusting your search terms or reset the industry domain filter.
          </p>
          <Button size="sm" asChild className="mt-5 h-8.5 bg-primary px-4 text-xs font-semibold text-primary-foreground rounded-lg">
            <Link to="/new-agent">Construct New Agent</Link>
          </Button>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} index={i} />
          ))}
        </div>
      ) : (
        /* 4. Fleet Matrix Table View */
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-background/50 font-mono text-[10px] text-muted-foreground uppercase">
                  <th className="py-3 px-4">Agent Identity</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Model Engine</th>
                  <th className="py-3 px-4">Runtime Status</th>
                  <th className="py-3 px-4">Last Invocation</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((agent) => (
                  <tr key={agent.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/25 text-primary shrink-0">
                          <Bot className="size-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-xs">{agent.name}</p>
                          <p className="text-[11px] text-muted-foreground">{agent.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className={cn("font-mono text-[10px] font-semibold px-2 py-0.5", industryBadgeStyles[agent.industry])}>
                        {industryLabels[agent.industry]}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                      {agent.model}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold",
                        agent.status === "active" ? "text-emerald-400" : "text-muted-foreground"
                      )}>
                        <span className={cn("size-1.5 rounded-full", agent.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
                        {agent.status === "active" ? "ACTIVE" : "STANDBY"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-foreground">
                      {agent.lastUsed}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" asChild className="h-7 px-2.5 text-[11px] border-border bg-background/50">
                          <Link to={`/agents/${agent.id}/edit`}>
                            <Pencil className="size-2.5 mr-1" />
                            Config
                          </Link>
                        </Button>
                        <Button size="sm" asChild className="h-7 px-2.5 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90">
                          <Link to="/new-agent">
                            <Play className="size-2.5 mr-1" />
                            Run
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
