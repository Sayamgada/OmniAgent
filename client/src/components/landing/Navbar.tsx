import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Menu, X, ArrowRight, Zap } from "lucide-react";

import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { useSiteTheme } from "../../context/ThemeContext";
import { ThemeToggle } from "./ThemeToggle";

const landingLinks = [
  { label: "Intent", href: "#describe" },
  { label: "Flow", href: "#execution" },
  { label: "Possibilities", href: "#domains" },
  { label: "Outcomes", href: "#outcomes" },
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
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  const { isLoggedIn } = useAuth();
  const { siteTheme, heroTheme, themeProgress } = useSiteTheme();

  // Track scroll position to dynamically adapt navbar to active visual world
  useEffect(() => {
    if (variant !== "landing") {
      setIsScrolledPastHero(true);
      return;
    }

    const handleScroll = () => {
      // Pinned hero is ~260vh tall, transition completes around 1.5x window.innerHeight
      const threshold = window.innerHeight * 1.5;
      setIsScrolledPastHero(window.scrollY >= threshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [variant]);

  // Current visual environment: In Hero -> heroTheme; In Site -> siteTheme
  const currentNavTheme = isScrolledPastHero ? siteTheme : heroTheme;
  const isLightMode = currentNavTheme === "light";

  // When inside Hero, calculate interpolated glass background from themeProgress
  const heroNavBg = `rgba(${Math.round(6 + (255 - 6) * themeProgress)}, ${Math.round(9 + (255 - 9) * themeProgress)}, ${Math.round(15 + (255 - 15) * themeProgress)}, ${0.8 + 0.08 * themeProgress})`;
  const heroNavBorder = `rgba(${Math.round(255 * (1 - themeProgress) + 226 * themeProgress)}, ${Math.round(255 * (1 - themeProgress) + 232 * themeProgress)}, ${Math.round(255 * (1 - themeProgress) + 240 * themeProgress)}, ${0.1 * (1 - themeProgress) + 0.8 * themeProgress})`;

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={!isScrolledPastHero ? { backgroundColor: heroNavBg, borderColor: heroNavBorder } : undefined}
      className={`fixed left-0 right-0 top-0 z-50 transition-colors duration-350 backdrop-blur-2xl ${
        isScrolledPastHero
          ? "border-b border-border/80 bg-background/85 text-foreground shadow-xs"
          : `border-b ${isLightMode ? "text-slate-900 shadow-sm" : "text-white"}`
      }`}
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
          <span className={`text-base font-bold tracking-tight ${isLightMode ? "text-slate-900" : "text-white"}`}>
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
                className={`text-xs font-medium transition-colors hover:text-primary ${
                  isLightMode ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                }`}
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
                className={`text-xs font-medium ${
                  isLightMode ? "text-slate-700 hover:text-slate-900 hover:bg-slate-100" : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
                asChild
              >
                <Link to="/sign-in">Sign In</Link>
              </Button>

              {/* Theme Toggle (Exact placement: Sign In -> [THEME TOGGLE] -> Start Free) */}
              <ThemeToggle />

              <Button
                size="sm"
                className="h-8.5 gap-1.5 bg-primary px-4 text-xs font-bold text-black hover:bg-primary/90 glow-primary rounded-lg shadow-sm"
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
                className="h-8.5 gap-1.5 bg-primary px-4 text-xs font-bold text-black hover:bg-primary/90 glow-primary rounded-lg"
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
              <Button size="sm" className="h-8.5 bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg" asChild>
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
          className={`flex size-9 items-center justify-center rounded-lg border transition-colors md:hidden ${
            isLightMode ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "border-white/10 bg-white/5 text-slate-300 hover:text-white"
          }`}
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
            className={`border-t px-5 pb-6 pt-3 backdrop-blur-2xl md:hidden text-left ${
              isLightMode ? "border-slate-200 bg-white/98 text-slate-900" : "border-white/10 bg-[#06090F]/98 text-white"
            }`}
          >
            {variant === "landing"
              ? landingLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block py-2.5 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))
              : authLinks.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="block py-2.5 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

            {/* Mobile Theme Toggle Row */}
            <div className="flex items-center justify-between py-3 border-t border-slate-200/40 mt-2">
              <span className="text-xs font-medium text-muted-foreground">Appearance Theme</span>
              <ThemeToggle variant="mobile" />
            </div>

            <div className="mt-2 flex flex-col gap-2 border-t border-slate-200/50 pt-3">
              {variant === "landing" && !isLoggedIn && (
                <>
                  <Button variant="outline" className="w-full text-xs justify-center" asChild>
                    <Link to="/sign-in" onClick={() => setMobileOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button className="w-full bg-primary text-xs font-bold text-black justify-center" asChild>
                    <Link to="/sign-up" onClick={() => setMobileOpen(false)}>
                      Start Free
                    </Link>
                  </Button>
                </>
              )}
              {((variant === "landing" && isLoggedIn) || variant === "auth") && (
                <Button className="w-full bg-primary text-xs font-bold text-black justify-center" asChild>
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
