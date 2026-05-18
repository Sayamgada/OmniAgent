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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Agents</h1>
          <p className="text-sm text-muted-foreground">
            Manage and interact with your AI agents
          </p>
        </div>
        <Button asChild className="gap-2 shrink-0">
          <Link to="/new-agent">
            <Plus className="h-4 w-4" />
            Create Agent
          </Link>
        </Button>
      </div>

      <div className="glass-card flex flex-col gap-4 rounded-2xl p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border/50 bg-muted/30 pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-[140px] border-border/50 bg-muted/30">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[120px] border-border/50 bg-muted/30">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[130px] border-border/50 bg-muted/30">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="conversations">Conversations</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border border-border/50 p-0.5">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card flex flex-col items-center justify-center rounded-2xl py-16 text-center"
        >
          <p className="text-lg font-medium">No agents found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your filters or create a new agent
          </p>
          <Button asChild className="mt-4">
            <Link to="/new-agent">Create Agent</Link>
          </Button>
        </motion.div>
      ) : (
        <div
          className={cn(
            view === "grid"
              ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-4"
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
