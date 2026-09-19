import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

export type SiteTheme = "light" | "dark";
export type HeroTheme = "light" | "dark";

type HslColor = [number, number, number];

const THEME_TOKENS: Record<"dark" | "light", Record<string, HslColor>> = {
  dark: {
    "--background": [224, 45, 4],        // #06090F - Deep Obsidian
    "--foreground": [210, 40, 98],       // #F8FAFC - Pure Crisp White
    "--card": [223, 38, 8],              // #0D131F - Elevated Graphite Surface
    "--card-foreground": [210, 40, 98],
    "--popover": [223, 38, 8],
    "--popover-foreground": [210, 40, 98],
    "--primary": [217, 100, 56],         // #1E70FF - Technical Azure
    "--primary-foreground": [0, 0, 100],
    "--secondary": [160, 84, 42],        // #14C286 - Emerald Execution Pulse
    "--secondary-foreground": [0, 0, 100],
    "--muted": [222, 30, 12],            // #131A28 - Muted Fill
    "--muted-foreground": [217, 19, 65], // #96A4B8 - Secondary Slate
    "--accent": [198, 93, 52],           // #0BA5EC - Radiant Cyan
    "--accent-foreground": [0, 0, 100],
    "--border": [220, 28, 16],           // #1C2436 - Fine Hairline Border
    "--input": [220, 28, 16],
    "--ring": [217, 100, 56],
  },
  light: {
    "--background": [0, 0, 100],         // #FFFFFF - Pure White
    "--foreground": [222, 47, 11],       // #0F172A - Deep Slate Typography
    "--card": [0, 0, 100],               // #FFFFFF - Clean White Card
    "--card-foreground": [222, 47, 11],
    "--popover": [0, 0, 100],
    "--popover-foreground": [222, 47, 11],
    "--primary": [217, 100, 50],         // #0066FF
    "--primary-foreground": [0, 0, 100],
    "--secondary": [160, 84, 39],        // #10B981
    "--secondary-foreground": [0, 0, 100],
    "--muted": [210, 40, 96],            // #F1F5F9 - Soft Gray Fill
    "--muted-foreground": [215, 16, 45], // #64748B
    "--accent": [198, 93, 45],
    "--accent-foreground": [0, 0, 100],
    "--border": [214, 32, 88],           // #E2E8F0
    "--input": [214, 32, 88],
    "--ring": [217, 100, 50],
  },
};

function lerpHsl(from: HslColor, to: HslColor, t: number): string {
  const h = Math.round(from[0] + (to[0] - from[0]) * t);
  const s = Math.round(from[1] + (to[1] - from[1]) * t);
  const l = Math.round(from[2] + (to[2] - from[2]) * t);
  return `${h} ${s}% ${l}%`;
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

interface ThemeContextType {
  siteTheme: SiteTheme;
  heroTheme: HeroTheme;
  themeProgress: number; // 0.0 = Light Site / Dark Hero, 1.0 = Dark Site / Light Hero
  isTransitioning: boolean;
  setSiteTheme: (theme: SiteTheme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "omniagent-theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): SiteTheme {
  if (typeof window === "undefined") return "light";
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  } catch {
    return "light";
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [siteTheme, setSiteThemeState] = useState<SiteTheme>(getInitialTheme);
  // themeProgress: 0.0 = Light Site / Dark Hero, 1.0 = Dark Site / Light Hero
  const [themeProgress, setThemeProgress] = useState<number>(() => (getInitialTheme() === "dark" ? 1.0 : 0.0));
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);

  // Inverted Hero Theme: Hero always uses the OPPOSITE visual theme from the website
  const heroTheme: HeroTheme = siteTheme === "light" ? "dark" : "light";

  const applyThemeToDOM = useCallback((theme: SiteTheme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-hero-theme", theme === "light" ? "dark" : "light");
    root.style.colorScheme = theme;
  }, []);

  // Sync DOM classes on initial mount
  useEffect(() => {
    applyThemeToDOM(siteTheme);
  }, [applyThemeToDOM, siteTheme]);

  // Listen to OS system theme changes if user hasn't explicitly set a preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const newTheme = e.matches ? "dark" : "light";
        setSiteTheme(newTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Coordinated animated theme transition
  const transitionToTheme = useCallback((targetTheme: SiteTheme) => {
    const currentTheme = siteTheme;
    if (currentTheme === targetTheme && !isTransitioning) return;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      applyThemeToDOM(targetTheme);
      setSiteThemeState(targetTheme);
      setThemeProgress(targetTheme === "dark" ? 1.0 : 0.0);
      setIsTransitioning(false);
      try {
        localStorage.setItem(STORAGE_KEY, targetTheme);
      } catch {}
      return;
    }

    setIsTransitioning(true);
    const fromProgress = themeProgress;
    const targetProgress = targetTheme === "dark" ? 1.0 : 0.0;
    const fromTokens = THEME_TOKENS[currentTheme];
    const toTokens = THEME_TOKENS[targetTheme];
    const root = document.documentElement;

    const duration = 450; // 450ms coordinated transition duration
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const linearT = Math.min(1.0, Math.max(0, elapsed / duration));
      const easedT = easeInOutCubic(linearT);

      // Interpolate progress: 0.0 = Light Site / Dark Hero, 1.0 = Dark Site / Light Hero
      const currentProg = fromProgress + (targetProgress - fromProgress) * easedT;
      setThemeProgress(currentProg);
      root.style.setProperty("--theme-progress", currentProg.toFixed(4));

      // Interpolate root CSS variables frame-by-frame
      for (const [key, fromVal] of Object.entries(fromTokens)) {
        const toVal = toTokens[key];
        if (toVal) {
          root.style.setProperty(key, lerpHsl(fromVal, toVal, easedT));
        }
      }

      if (linearT < 1.0) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Transition complete: clean up inline style overrides and finalize DOM classes
        applyThemeToDOM(targetTheme);
        for (const key of Object.keys(fromTokens)) {
          root.style.removeProperty(key);
        }
        root.style.setProperty("--theme-progress", targetProgress.toFixed(4));
        setSiteThemeState(targetTheme);
        setThemeProgress(targetProgress);
        setIsTransitioning(false);
        animFrameRef.current = null;

        try {
          localStorage.setItem(STORAGE_KEY, targetTheme);
        } catch {}
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [applyThemeToDOM, isTransitioning, siteTheme, themeProgress]);

  const setSiteTheme = useCallback((theme: SiteTheme) => {
    transitionToTheme(theme);
  }, [transitionToTheme]);

  const toggleTheme = useCallback(() => {
    const nextTheme = siteTheme === "light" ? "dark" : "light";
    transitionToTheme(nextTheme);
  }, [siteTheme, transitionToTheme]);

  return (
    <ThemeContext.Provider
      value={{
        siteTheme,
        heroTheme,
        themeProgress,
        isTransitioning,
        setSiteTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useSiteTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useSiteTheme must be used within a ThemeProvider");
  }
  return context;
};
