/**
 * Adapter bridging next-themes into the Obsidian Bronze landing contracts.
 * next-themes remains the only theme provider. Do not mount this as a second provider.
 */
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { OBSIDIAN_BRONZE_THEME, type SiteTheme, type ThemeDefinition } from "./ThemeVariants";

export type { SiteTheme };
export { OBSIDIAN_BRONZE_THEME };

export interface SiteThemeAdapter {
  siteTheme: SiteTheme;
  heroTheme: SiteTheme;
  themeProgress: number;
  variant: ThemeDefinition;
  toggleTheme: () => void;
  setTheme: (theme: SiteTheme) => void;
}

export const useSiteTheme = (): SiteThemeAdapter => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = (mounted ? resolvedTheme || theme : theme || "dark") as string;
  const siteTheme: SiteTheme = activeTheme === "light" ? "light" : "dark";
  const isDark = siteTheme === "dark";
  // Dual atmosphere: light pages keep a dark hero canvas, dark pages invert it.
  const heroTheme: SiteTheme = isDark ? "light" : "dark";
  const themeProgress = isDark ? 1 : 0;

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute("data-theme", siteTheme);
    root.setAttribute("data-hero-theme", heroTheme);
    root.style.colorScheme = siteTheme;
  }, [mounted, siteTheme, heroTheme]);

  return {
    siteTheme,
    heroTheme,
    themeProgress,
    variant: OBSIDIAN_BRONZE_THEME,
    toggleTheme: () => setTheme(isDark ? "light" : "dark"),
    setTheme: (next: SiteTheme) => setTheme(next),
  };
};

export default useSiteTheme;
