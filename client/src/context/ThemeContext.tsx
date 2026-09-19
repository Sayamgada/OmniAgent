import React, { createContext, useContext, useEffect, useState } from "react";

export type SiteTheme = "light" | "dark";
export type HeroTheme = "light" | "dark";

interface ThemeContextType {
  siteTheme: SiteTheme;
  heroTheme: HeroTheme;
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
    // Fall back to system preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  } catch {
    return "light";
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [siteTheme, setSiteThemeState] = useState<SiteTheme>(getInitialTheme);

  // Inverted Hero Theme: Hero always uses the OPPOSITE visual theme from the website
  const heroTheme: HeroTheme = siteTheme === "light" ? "dark" : "light";

  const applyThemeToDOM = (theme: SiteTheme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-hero-theme", theme === "light" ? "dark" : "light");
    root.style.colorScheme = theme;
  };

  useEffect(() => {
    applyThemeToDOM(siteTheme);
  }, [siteTheme]);

  // Listen to OS system theme changes if user hasn't explicitly set a preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const newTheme = e.matches ? "dark" : "light";
        setSiteThemeState(newTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setSiteTheme = (theme: SiteTheme) => {
    setSiteThemeState(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  };

  const toggleTheme = () => {
    setSiteTheme(siteTheme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ siteTheme, heroTheme, setSiteTheme, toggleTheme }}>
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
