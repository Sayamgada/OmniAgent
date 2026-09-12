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
};

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home, end: true },
  { to: "/agents", label: "My Agents", icon: LayoutGrid },
  { to: "/new-agent", label: "Create Agent", icon: Plus },
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/settings", label: "Settings", icon: Settings },
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
        "flex h-full flex-col border-r border-border bg-card/95 backdrop-blur-md transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-3.5">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight gradient-text">OmniAgent</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 text-muted-foreground hover:text-foreground lg:flex"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
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
                  ? "bg-primary/15 text-primary border border-primary/30 font-semibold"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "relative z-10 h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && <span className="relative z-10">{item.label}</span>}
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.to} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="bg-card text-foreground border-border text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-border p-3.5">
          <div className="rounded-lg border border-border/80 bg-background/50 p-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Workspace</span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-foreground truncate">Enterprise Production</p>
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
