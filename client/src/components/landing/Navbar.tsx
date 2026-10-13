import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Menu, X, ArrowRight, Zap } from "lucide-react";

import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";

const landingLinks = [
  { label: "Intent", href: "#what-is-omniagent" },
  { label: "Flow", href: "#the-work-disappears" },
  { label: "Possibilities", href: "#before-after" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Experience", href: "#experience" },
] as const;

const authLinks = [
  { label: "Overview", to: "/#about" },
  { label: "Capabilities", to: "/#features" },
] as const;

type NavbarProps = {
  variant?: "landing" | "auth";
};

const Navbar = ({ variant = "landing" }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoggedIn } = useAuth();

  return (
    <header
      className="sticky top-0 left-0 right-0 z-40 w-full transition-colors duration-300 backdrop-blur-2xl border-b border-border/70 bg-background/85 text-foreground shadow-xs"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group"
          onClick={() => setMobileOpen(false)}
        >
          <div className="flex size-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/15 text-primary group-hover:border-primary/70 transition-colors shadow-sm">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            Omni<span className="text-primary font-extrabold">Agent</span>
          </span>
          <span className="hidden sm:inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-medium text-primary">
            v2.4
          </span>
        </Link>

        {/* Desktop Nav Links */}
        {variant === "landing" ? (
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main Navigation">
            {landingLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : (
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Auth Navigation">
            {authLinks.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Action CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          {variant === "landing" && !isLoggedIn && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                asChild
              >
                <Link to="/sign-in">Sign In</Link>
              </Button>

              {/* Theme Toggle */}
              <ThemeToggle />

              <Button
                size="sm"
                className="h-8.5 gap-1.5 bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm rounded-lg"
                asChild
              >
                <Link to="/sign-up">
                  <span>Start Free</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </>
          )}

          {variant === "landing" && isLoggedIn && (
            <>
              <ThemeToggle />
              <Button
                size="sm"
                className="h-8.5 gap-1.5 bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary/90 rounded-lg"
                asChild
              >
                <Link to="/dashboard">
                  <Zap className="size-3.5" />
                  <span>Open Workspace</span>
                </Link>
              </Button>
            </>
          )}

          {variant === "auth" && (
            <>
              <ThemeToggle />
              <Button size="sm" className="h-8.5 bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 rounded-lg" asChild>
                <Link to={isLoggedIn ? "/dashboard" : "/sign-up"}>
                  {isLoggedIn ? "Open Workspace" : "Get Started"}
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground md:hidden transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border px-5 pb-6 pt-3 backdrop-blur-2xl md:hidden text-left bg-card text-foreground"
          >
            {variant === "landing"
              ? landingLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block py-2.5 text-sm font-medium hover:text-primary transition-colors text-muted-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))
              : authLinks.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="block py-2.5 text-sm font-medium hover:text-primary transition-colors text-muted-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

            {/* Mobile Theme Toggle Row */}
            <div className="flex items-center justify-between py-3 border-t border-border/50 mt-2">
              <span className="text-xs font-medium text-muted-foreground">Appearance Theme</span>
              <ThemeToggle variant="mobile" />
            </div>

            <div className="mt-2 flex flex-col gap-2 border-t border-border/50 pt-3">
              {variant === "landing" && !isLoggedIn && (
                <>
                  <Button variant="outline" className="w-full text-xs justify-center" asChild>
                    <Link to="/sign-in" onClick={() => setMobileOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button className="w-full bg-primary text-xs font-bold text-primary-foreground justify-center" asChild>
                    <Link to="/sign-up" onClick={() => setMobileOpen(false)}>
                      Start Free
                    </Link>
                  </Button>
                </>
              )}
              {((variant === "landing" && isLoggedIn) || variant === "auth") && (
                <Button className="w-full bg-primary text-xs font-bold text-primary-foreground justify-center" asChild>
                  <Link
                    to={isLoggedIn ? "/dashboard" : "/sign-up"}
                    onClick={() => setMobileOpen(false)}
                  >
                    {isLoggedIn ? "Open Workspace" : "Get Started"}
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
