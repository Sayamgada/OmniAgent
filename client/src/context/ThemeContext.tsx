import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type {
  ThemeVariantId,
  SiteTheme,
  HeroTheme,
  ThemeDefinition,
  ThemeVariantDefinition,
} from "./ThemeVariants";
import { OBSIDIAN_BRONZE_THEME } from "./ThemeVariants";

export type { ThemeVariantId, SiteTheme, HeroTheme, ThemeDefinition, ThemeVariantDefinition };
export { OBSIDIAN_BRONZE_THEME };

export interface ThemeContextType {
  siteTheme: SiteTheme;
  heroTheme: HeroTheme;
  themeProgress: number; // 0.0 = Light Site / Dark Hero, 1.0 = Dark Site / Light Hero
  isTransitioning: boolean;
  variantId: string;
  variant: ThemeDefinition;
  canvasPalette: ThemeDefinition["canvasPalette"]["dark"];
  setSiteTheme: (theme: SiteTheme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "omniagent-theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialGlobalTheme(): SiteTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  } catch {
    return "dark";
  }
}

// Convert HSL tokens to CSS style object with HSL space-separated strings
export function getCssVariablesForTheme(
  _variantIdOrMode?: string | SiteTheme,
  optionalMode?: SiteTheme
): Record<string, string> {
  const mode: SiteTheme =
    optionalMode ||
    (_variantIdOrMode === "light" || _variantIdOrMode === "dark" ? _variantIdOrMode : "dark");

  const variant = OBSIDIAN_BRONZE_THEME;
  const tokens = variant.tokens[mode];
  const cssVars: Record<string, string> = {};

  for (const [key, [h, s, l]] of Object.entries(tokens)) {
    cssVars[key] = `${h} ${s}% ${l}%`;
  }

  // Also define semantic gradient variables
  const cp = variant.canvasPalette[mode];
  cssVars["--accent-glow-primary"] = cp.primary;
  cssVars["--accent-glow-secondary"] = cp.secondary;
  cssVars["--accent-glow-tertiary"] = cp.accent;

  return cssVars;
}

/**
 * Root Global ThemeProvider
 * Permanently uses Theme 02 — Obsidian Bronze
 */
export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  defaultTheme?: SiteTheme;
  [key: string]: any;
}> = ({ children }) => {
  const [siteTheme, setSiteThemeState] = useState<SiteTheme>(getInitialGlobalTheme);
  const [themeProgress, setThemeProgress] = useState<number>(() =>
    getInitialGlobalTheme() === "dark" ? 1.0 : 0.0
  );
  const [isTransitioning] = useState<boolean>(false);

  const heroTheme: HeroTheme = siteTheme === "light" ? "dark" : "light";
  const variant = OBSIDIAN_BRONZE_THEME;
  const canvasPalette = variant.canvasPalette[siteTheme];

  // Apply default classes to html root across every page & route
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(siteTheme);
    root.setAttribute("data-theme", siteTheme);
    root.setAttribute("data-theme-palette", "obsidian-bronze");
    root.style.colorScheme = siteTheme;

    // Apply tokens to root document
    const cssVars = getCssVariablesForTheme(siteTheme);
    for (const [key, val] of Object.entries(cssVars)) {
      root.style.setProperty(key, val);
    }
  }, [siteTheme]);

  // Listen for system preference changes if user hasn't set one
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const newTheme = e.matches ? "dark" : "light";
        setSiteThemeState(newTheme);
        setThemeProgress(newTheme === "dark" ? 1.0 : 0.0);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setSiteTheme = useCallback((theme: SiteTheme) => {
    setSiteThemeState(theme);
    setThemeProgress(theme === "dark" ? 1.0 : 0.0);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = siteTheme === "light" ? "dark" : "light";
    setSiteTheme(nextTheme);
  }, [siteTheme, setSiteTheme]);

  const value = useMemo<ThemeContextType>(
    () => ({
      siteTheme,
      heroTheme,
      themeProgress,
      isTransitioning,
      variantId: "theme-02",
      variant,
      canvasPalette,
      setSiteTheme,
      toggleTheme,
    }),
    [siteTheme, heroTheme, themeProgress, isTransitioning, variant, canvasPalette, setSiteTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useSiteTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useSiteTheme must be used within a ThemeProvider");
  }
  return context;
};
