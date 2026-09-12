import { motion } from "framer-motion";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AgentCard } from "../../components/dashboard/AgentCard";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { mockAgents } from "../../lib/dashboard-data";
import { cn } from "../../lib/utils";

export default function MyAgents() {
  const [view, setView] = useState<"grid" | "list">("grid");
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

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">My Agents</h1>
          <p className="text-xs text-muted-foreground">
            Manage, configure, and invoke your domain-specific AI agents
          </p>
        </div>
        <Button size="sm" asChild className="h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary self-start sm:self-auto">
          <Link to="/new-agent">
            <Plus className="size-3.5" />
            New Agent
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-border bg-background/50 pl-9 text-xs focus-visible:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="h-9 w-[130px] border-border bg-background/50 text-xs">
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
            <SelectTrigger className="h-9 w-[110px] border-border bg-background/50 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card text-xs">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[120px] border-border bg-background/50 text-xs">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card text-xs">
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="conversations">Most Invocations</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border border-border bg-background/50 p-0.5">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-sm font-semibold text-foreground">No agents match your criteria</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search query or industry filter
          </p>
          <Button size="sm" asChild className="mt-4 h-8 bg-primary text-xs text-primary-foreground">
            <Link to="/new-agent">Create Agent</Link>
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            view === "grid"
              ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-3"
          )}
        >
          {filtered.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
