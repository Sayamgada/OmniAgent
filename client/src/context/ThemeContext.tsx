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
  landingTheme: SiteTheme;
  heroTheme: SiteTheme;
  destinationTheme: SiteTheme;
  siteTheme: SiteTheme;
  themeProgress: number;
  variant: ThemeDefinition;
  toggleTheme: () => void;
  setLandingTheme: (theme: SiteTheme) => void;
  setTheme: (theme: SiteTheme) => void;
}

export const useSiteTheme = (): SiteThemeAdapter => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // landingTheme: the user's persistent preference for the landing page sections
  const activePreference = (mounted ? resolvedTheme || theme : theme || "light") as string;
  const landingTheme: SiteTheme = activePreference === "dark" ? "dark" : "light";
  const isLandingDark = landingTheme === "dark";

  // heroTheme: ALWAYS the inverse of landingTheme
  const heroTheme: SiteTheme = isLandingDark ? "light" : "dark";
  const destinationTheme: SiteTheme = landingTheme;
  const themeProgress = heroTheme === "dark" ? 1 : 0;

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute("data-landing-theme", landingTheme);
    root.setAttribute("data-hero-theme", heroTheme);
    root.setAttribute("data-destination-theme", destinationTheme);
    root.setAttribute("data-theme", landingTheme);
    root.style.colorScheme = landingTheme;
  }, [mounted, landingTheme, heroTheme, destinationTheme]);

  return {
    landingTheme,
    heroTheme,
    destinationTheme,
    siteTheme: landingTheme,
    themeProgress,
    variant: OBSIDIAN_BRONZE_THEME,
    toggleTheme: () => setTheme(isLandingDark ? "light" : "dark"),
    setLandingTheme: (next: SiteTheme) => setTheme(next),
    setTheme: (next: SiteTheme) => setTheme(next),
  };
};

export default useSiteTheme;
