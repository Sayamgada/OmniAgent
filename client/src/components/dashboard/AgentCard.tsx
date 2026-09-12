import { motion } from "framer-motion";
import {
  Copy,
  GitBranch,
  MessageSquare,
  MoreVertical,
  Pencil,
  Trash2,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-bold text-sm text-foreground">{agent.name}</h3>
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-[10px]",
                agent.status === "active"
                  ? "border-secondary/40 bg-secondary/10 text-secondary"
                  : "border-border bg-background/50 text-muted-foreground"
              )}
            >
              {agent.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{agent.role}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              aria-label="Agent options"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 border-border bg-card">
            <DropdownMenuItem asChild className="cursor-pointer text-xs">
              <Link to={`/agents/${agent.id}/edit`}>
                <Pencil className="mr-2 size-3.5 text-muted-foreground" />
                Edit Agent
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("Duplicate")} className="cursor-pointer text-xs">
              <Copy className="mr-2 size-3.5 text-muted-foreground" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("Add to workflow")} className="cursor-pointer text-xs">
              <GitBranch className="mr-2 size-3.5 text-muted-foreground" />
              Add to Workflow
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="cursor-pointer text-xs text-destructive focus:text-destructive"
              onClick={() => handleAction("Delete")}
            >
              <Trash2 className="mr-2 size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn("font-mono text-[10px]", industryBadgeStyles[agent.industry] ?? "border-border text-muted-foreground")}
        >
          {industryLabels[agent.industry]}
        </Badge>
        <span className="font-mono text-[10px] text-muted-foreground">
          {agent.model}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/70 pt-3 text-xs">
        <div>
          <p className="text-[10px] text-muted-foreground">Last Invocation</p>
          <p className="mt-0.5 font-medium font-mono text-[11px] text-foreground">{agent.lastUsed}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Conversations</p>
          <p className="mt-0.5 font-medium font-mono text-[11px] text-foreground">
            {agent.conversations.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" className="h-8 flex-1 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary" asChild>
          <Link to="/new-agent">
            <MessageSquare className="size-3" />
            Run Agent
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="h-8 flex-1 border-border bg-background/50 text-xs text-foreground hover:bg-card" asChild>
          <Link to={`/agents/${agent.id}/edit`}>Edit</Link>
        </Button>
      </div>
    </motion.div>
  );
}
