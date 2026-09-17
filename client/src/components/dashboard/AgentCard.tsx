import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  Copy,
  Cpu,
  GitBranch,
  MessageSquare,
  MoreVertical,
  Pencil,
  Play,
  Trash2,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import type { Agent } from "../../lib/dashboard-data";
import { industryLabels } from "../../lib/dashboard-data";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../../lib/utils";

const industryBadgeStyles: Record<string, string> = {
  corporate: "border-primary/40 bg-primary/10 text-primary",
  education: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  finance: "border-secondary/40 bg-secondary/10 text-secondary",
};

type AgentCardProps = {
  agent: Agent;
  index?: number;
};

export function AgentCard({ agent, index = 0 }: AgentCardProps) {
  const handleAction = (action: string) => {
    toast.success(`${action}: ${agent.name}`);
  };

  const isActive = agent.status === "active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group relative rounded-2xl border border-border/80 bg-card p-5 text-left transition-all duration-200 hover:border-primary/50 hover:shadow-[0_8px_30px_rgba(0,102,255,0.08)] flex flex-col justify-between"
    >
      <div>
        {/* Top Header: Identity Glyph + Name + Status + More Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary group-hover:scale-105 transition-transform shrink-0">
              <Bot className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-foreground truncate">{agent.name}</h3>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold border",
                    isActive
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-border bg-background/50 text-muted-foreground"
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
                  {isActive ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
                aria-label="Agent options"
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 border-border bg-card p-1">
              <DropdownMenuItem asChild className="cursor-pointer text-xs py-1.5 px-2.5">
                <Link to={`/agents/${agent.id}/edit`}>
                  <Pencil className="mr-2 size-3.5 text-muted-foreground" />
                  Edit Configuration
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("Duplicate")} className="cursor-pointer text-xs py-1.5 px-2.5">
                <Copy className="mr-2 size-3.5 text-muted-foreground" />
                Duplicate Spec
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("Add to workflow")} className="cursor-pointer text-xs py-1.5 px-2.5">
                <GitBranch className="mr-2 size-3.5 text-muted-foreground" />
                Add to Pipeline
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/80" />
              <DropdownMenuItem
                className="cursor-pointer text-xs py-1.5 px-2.5 text-destructive focus:text-destructive"
                onClick={() => handleAction("Delete")}
              >
                <Trash2 className="mr-2 size-3.5" />
                Decommission
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Domain & Model Tags */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn("font-mono text-[10px] font-semibold px-2 py-0.5", industryBadgeStyles[agent.industry] ?? "border-border text-muted-foreground")}
          >
            {industryLabels[agent.industry]}
          </Badge>
          <span className="rounded bg-background/60 border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground font-medium">
            {agent.model}
          </span>
        </div>

        {/* Telemetry Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-background/40 p-2.5 text-xs">
          <div>
            <span className="font-mono text-[10px] text-muted-foreground">Last Invoked</span>
            <p className="mt-0.5 font-mono font-semibold text-foreground text-[11px]">{agent.lastUsed}</p>
          </div>
          <div>
            <span className="font-mono text-[10px] text-muted-foreground">Invocations</span>
            <p className="mt-0.5 font-mono font-semibold text-foreground text-[11px]">
              {agent.conversations.toLocaleString()} runs
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/60">
        <Button
          size="sm"
          className="h-8 flex-1 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg"
          asChild
        >
          <Link to="/new-agent">
            <Play className="size-3 fill-current" />
            Run Agent
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 border-border/80 bg-background/50 text-xs font-medium text-foreground hover:bg-card rounded-lg"
          asChild
        >
          <Link to={`/agents/${agent.id}/edit`}>
            <Pencil className="size-3 mr-1" />
            Config
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
