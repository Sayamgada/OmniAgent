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

const navItems = [
  { to: "/dashboard", label: "Dashboard Home", icon: Home, end: true },
  { to: "/agents", label: "My Agents", icon: LayoutGrid },
  { to: "/new-agent", label: "Create Agent", icon: Plus },
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

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
        "flex h-full flex-col border-r border-border/50 bg-card/40 backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border/50 px-3">
        {!collapsed && (
          <div className="flex items-center gap-2 px-1">
            <Bot className="h-6 w-6 text-primary" />
            <span className="text-sm font-bold gradient-text">OmniAgent</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 shrink-0 lg:flex"
          onClick={onToggle}
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
          className="h-8 w-8 lg:hidden"
          onClick={onMobileClose}
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
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/15 text-primary shadow-[0_0_20px_hsl(211_100%_50%_/_0.15)]"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl border border-primary/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "relative z-10 h-5 w-5 shrink-0 transition-colors",
                  isActive && "text-primary"
                )}
              />
              {!collapsed && <span className="relative z-10">{item.label}</span>}
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.to} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-border/50 p-4">
          <p className="text-xs text-muted-foreground">
            Enterprise AI workspace
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/70">
            v1.0 · Multi-industry agents
          </p>
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
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {sidebarContent}
      </motion.div>
    </>
  );
}
