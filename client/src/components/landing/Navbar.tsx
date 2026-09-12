import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Menu, X } from "lucide-react";

import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";

const landingLinks = [
  { label: "Overview", href: "#about" },
  { label: "Capabilities", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Industries", href: "#use-cases" },
] as const;

const authLinks = [
  { label: "Capabilities", to: "/#features" },
  { label: "Overview", to: "/#about" },
] as const;

type NavbarProps = {
  variant?: "landing" | "auth";
};

const Navbar = ({ variant = "landing" }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoggedIn } = useAuth();

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed left-0 right-0 top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5"
          onClick={() => setMobileOpen(false)}
        >
          <div className="flex size-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            Omni<span className="text-primary">Agent</span>
          </span>
        </Link>

        {variant === "landing" ? (
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main Navigation">
            {landingLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : (
          <nav className="hidden items-center gap-7 md:flex" aria-label="Auth Navigation">
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

        <div className="hidden items-center gap-3 md:flex">
          {variant === "landing" && !isLoggedIn && (
            <>
              <Button variant="ghost" size="sm" className="text-xs font-medium text-muted-foreground hover:text-foreground" asChild>
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button size="sm" className="h-8 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary" asChild>
                <Link to="/sign-up">Start Free</Link>
              </Button>
            </>
          )}
          {variant === "landing" && isLoggedIn && (
            <Button size="sm" className="h-8 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary" asChild>
              <Link to="/dashboard">Open Workspace</Link>
            </Button>
          )}
          {variant === "auth" && (
            <Button size="sm" className="h-8 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary" asChild>
              <Link to={isLoggedIn ? "/dashboard" : "/sign-up"}>
                {isLoggedIn ? "Open Workspace" : "Get Started"}
              </Link>
            </Button>
          )}
        </div>

        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-card/95 px-4 pb-5 pt-2 backdrop-blur-md md:hidden"
          >
            {variant === "landing"
              ? landingLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                ))
              : authLinks.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="block py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              {variant === "landing" && !isLoggedIn && (
                <>
                  <Button variant="outline" className="w-full text-xs" asChild>
                    <Link to="/sign-in" onClick={() => setMobileOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                  <Button className="w-full bg-primary text-xs text-primary-foreground" asChild>
                    <Link to="/sign-up" onClick={() => setMobileOpen(false)}>
                      Start Free
                    </Link>
                  </Button>
                </>
              )}
              {((variant === "landing" && isLoggedIn) || variant === "auth") && (
                <Button className="w-full bg-primary text-xs text-primary-foreground" asChild>
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
    </motion.header>
  );
};

export default Navbar;
