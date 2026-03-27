import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot, Menu, X } from "lucide-react";

import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";

const landingLinks = ["Features", "How It Works", "Use Cases", "Pricing"] as const;

const authLinks = [
  { label: "Features", to: "/#features" },
  { label: "About", to: "/#about" },
] as const;

type NavbarProps = {
  variant?: "landing" | "auth";
};

const Navbar = ({ variant = "landing" }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoggedIn } = useAuth();

  const authCtaLabel = isLoggedIn ? "Dashboard" : "Launch App";

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed left-0 right-0 top-0 z-50 glass-card border-b border-border/30"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold" onClick={() => setMobileOpen(false)}>
          <Bot className="h-7 w-7 text-primary" />
          <span className="gradient-text">OmniAgent</span>
        </Link>

        {variant === "landing" ? (
          <div className="hidden items-center gap-8 md:flex">
            {landingLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s/g, "-")}`}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link}
              </a>
            ))}
          </div>
        ) : (
          <div className="hidden items-center gap-8 md:flex">
            {authLinks.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        <div className="hidden items-center gap-3 md:flex">
          {variant === "landing" && !isLoggedIn && (
            <>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
                <Link to="/sign-in">Log In</Link>
              </Button>
              <Button size="sm" className="glow-primary" asChild>
                <Link to="/sign-up">Get Started</Link>
              </Button>
            </>
          )}
          {variant === "landing" && isLoggedIn && (
            <Button size="sm" className="glow-primary" asChild>
              <Link to="/new-agent">Dashboard</Link>
            </Button>
          )}
          {variant === "auth" && (
            <Button size="sm" className="glow-primary" asChild>
              <Link to="/new-agent">{authCtaLabel}</Link>
            </Button>
          )}
        </div>

        <button type="button" className="text-foreground md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass-card border-t border-border/30 px-4 pb-4 md:hidden"
        >
          {variant === "landing"
            ? landingLinks.map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase().replace(/\s/g, "-")}`}
                  className="block py-3 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {link}
                </a>
              ))
            : authLinks.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="block py-3 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
          {variant === "landing" && !isLoggedIn && (
            <Button variant="ghost" className="mt-2 w-full" asChild>
              <Link to="/sign-in" onClick={() => setMobileOpen(false)}>
                Log In
              </Link>
            </Button>
          )}
          <Button className="mt-2 w-full glow-primary" asChild>
            <Link
              to={variant === "landing" && !isLoggedIn ? "/sign-up" : "/new-agent"}
              onClick={() => setMobileOpen(false)}
            >
              {variant === "auth" ? authCtaLabel : isLoggedIn ? "Dashboard" : "Get Started"}
            </Link>
          </Button>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
