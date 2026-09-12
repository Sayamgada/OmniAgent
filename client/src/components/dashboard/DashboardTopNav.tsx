import {
  Bot,
  LogOut,
  Menu,
  Moon,
  Plus,
  Sun,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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

export function DashboardTopNav({ onMenuClick }: DashboardTopNavProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm tracking-tight gradient-text">OmniAgent</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2 hover:bg-card border border-transparent hover:border-border">
                <Avatar className="h-7 w-7 border border-primary/30">
                  <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[120px] truncate text-xs font-medium text-foreground/90 lg:inline">
                  {displayName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-border bg-card">
              <DropdownMenuLabel>
                <p className="font-medium text-sm text-foreground">{displayName}</p>
                <p className="text-xs font-normal text-muted-foreground truncate">
                  {user?.email ?? "user@omniagent.io"}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer text-xs">
                <User className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-xs text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" className="hidden h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary sm:flex" asChild>
            <Link to="/new-agent">
              <Plus className="h-3.5 w-3.5" />
              New Agent
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
