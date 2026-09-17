import {
  Bot,
  LogOut,
  Menu,
  Moon,
  Plus,
  Sun,
  User,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";

import { useAuth } from "../../context/AuthContext";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type DashboardTopNavProps = {
  onMenuClick: () => void;
};

const routeNames: Record<string, string> = {
  "/dashboard": "System Overview",
  "/agents": "Fleet Management",
  "/new-agent": "Agent Construction Studio",
  "/integrations": "Integration Hub & Vault",
  "/settings": "Workspace Settings",
};

export function DashboardTopNav({ onMenuClick }: DashboardTopNavProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const displayName =
    user?.full_name ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const currentSection =
    routeNames[location.pathname] ||
    (location.pathname.startsWith("/agents/") ? "Agent Inspector" : "Console");

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
        {/* Left Section: Mobile Menu + Breadcrumb / Location */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground">
              Omni<span className="text-primary">Agent</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span className="font-mono text-[11px] text-muted-foreground">Workspace</span>
            <span className="text-border">/</span>
            <span className="font-semibold text-foreground">{currentSection}</span>
          </div>
        </div>

        {/* Right Section: System Telemetry + Theme + User + New Agent */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Real-time Telemetry Tag */}
          <div className="hidden md:flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              API Ready
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <ShieldCheck className="size-3 text-primary" />
              Isolated
            </span>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 gap-2 px-2 hover:bg-card border border-border/60 hover:border-border rounded-lg"
              >
                <Avatar className="h-6 w-6 border border-primary/40">
                  <AvatarFallback className="bg-primary/15 text-[10px] font-bold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[110px] truncate text-xs font-medium text-foreground/90 sm:inline">
                  {displayName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-border bg-card p-1">
              <DropdownMenuLabel className="px-3 py-2">
                <p className="font-semibold text-xs text-foreground">{displayName}</p>
                <p className="text-[11px] font-mono text-muted-foreground truncate">
                  {user?.email ?? "user@omniagent.io"}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/80" />
              <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer text-xs py-1.5 px-3">
                <Activity className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                Overview Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer text-xs py-1.5 px-3">
                <User className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                Workspace Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/80" />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-xs py-1.5 px-3 text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Create CTA */}
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg hidden sm:flex"
            asChild
          >
            <Link to="/new-agent">
              <Plus className="h-3.5 w-3.5" />
              <span>New Agent</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
