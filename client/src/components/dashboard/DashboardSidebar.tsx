import { motion } from "framer-motion";
import {
  Bot,
  ChevronLeft,
  Home,
  LayoutGrid,
  PanelLeftClose,
  PanelLeft,
  Plug,
  Plus,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
  badge?: string;
};

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: Home, end: true },
  { to: "/agents", label: "Fleet & Agents", icon: LayoutGrid },
  { to: "/new-agent", label: "Agent Studio", icon: Plus, badge: "New" },
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/settings", label: "Workspace Settings", icon: Settings },
];

type DashboardSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export function DashboardSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: DashboardSidebarProps) {
  const location = useLocation();

  const sidebarContent = (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border/80 bg-sidebar/95 backdrop-blur-2xl transition-all duration-300",
        collapsed ? "w-[70px]" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-border/70 px-3.5">
        {!collapsed && (
          <NavLink to="/" className="flex items-center gap-2.5 px-1 group">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 text-primary group-hover:border-primary/60 transition-colors">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1">
                Omni<span className="text-primary font-extrabold">Agent</span>
              </span>
            </div>
          </NavLink>
        )}

        {collapsed && (
          <div className="mx-auto flex size-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 text-primary">
            <Bot className="h-4 w-4" />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="hidden h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 lg:flex"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="h-3.5 w-3.5" />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground lg:hidden"
          onClick={onMobileClose}
          aria-label="Close sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Studio Trigger */}
      <div className="p-3 pb-1">
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to="/new-agent"
                onClick={onMobileClose}
                className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 glow-primary transition-all mx-auto"
              >
                <Plus className="size-4" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-card text-foreground border-border text-xs">
              Create Agent
            </TooltipContent>
          </Tooltip>
        ) : (
          <NavLink
            to="/new-agent"
            onClick={onMobileClose}
            className="flex items-center justify-between rounded-lg bg-gradient-to-r from-primary to-primary/90 px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 glow-primary transition-all shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="size-3.5" />
              <span>Create New Agent</span>
            </span>
            <span className="flex size-5 items-center justify-center rounded bg-white/20 text-white text-[10px] font-bold">
              +
            </span>
          </NavLink>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.end === true
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

          const link = (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onMobileClose}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/25 font-semibold"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-primary" />
              )}
              <Icon
                className={cn(
                  "relative z-10 h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span className="relative z-10">{item.label}</span>
                  {item.badge && (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-primary border border-primary/20">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.to} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="bg-card text-foreground border-border text-xs font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      {/* Bottom Live Telemetry Node */}
      {!collapsed && (
        <div className="border-t border-border/70 p-3">
          <div className="rounded-lg border border-border/80 bg-background/40 p-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-mono">Engine Status</span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 font-semibold">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Zap className="size-3 text-primary" />
                FastAPI + n8n
              </span>
              <span>v2.4.0</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <>
      {mobileOpen && (
        <motion.div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onMobileClose}
        />
      )}
      <motion.div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:static lg:z-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
      >
        {sidebarContent}
      </motion.div>
    </>
  );
}
