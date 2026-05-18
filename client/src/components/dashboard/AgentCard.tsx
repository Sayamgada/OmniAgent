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
import { industryColors, industryLabels } from "../../lib/dashboard-data";
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="glass-card-hover group relative rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{agent.name}</h3>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                agent.status === "active"
                  ? "border-secondary/40 bg-secondary/10 text-secondary"
                  : "border-muted-foreground/30 bg-muted text-muted-foreground"
              )}
            >
              {agent.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{agent.role}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleAction("Edit")}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Agent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("Duplicate")}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("Add to workflow")}>
              <GitBranch className="mr-2 h-4 w-4" />
              Add to Workflow
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => handleAction("Delete")}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Badge
        variant="outline"
        className={cn("mt-3 text-xs", industryColors[agent.industry])}
      >
        {industryLabels[agent.industry]}
      </Badge>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div>
          <p className="text-[10px] uppercase tracking-wider">Last Used</p>
          <p className="mt-0.5 font-medium text-foreground">{agent.lastUsed}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider">Model</p>
          <p className="mt-0.5 font-medium text-foreground">{agent.model}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] uppercase tracking-wider">Conversations</p>
          <p className="mt-0.5 font-medium text-foreground">
            {agent.conversations.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1 gap-1.5" asChild>
          <Link to="/new-agent">
            <MessageSquare className="h-3.5 w-3.5" />
            Open Chat
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="flex-1" asChild>
          <Link to="/new-agent">Edit</Link>
        </Button>
      </div>
    </motion.div>
  );
}
