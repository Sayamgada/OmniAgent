export type SiteTheme = "light" | "dark";
export type HeroTheme = "light" | "dark";

export type HslColor = [number, number, number];

export interface ThemeDefinition {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  swatches: string[];
  tokens: {
    dark: Record<string, HslColor>;
    light: Record<string, HslColor>;
  };
  canvasPalette: {
    dark: {
      primary: string;
      secondary: string;
      accent: string;
      tertiary: string;
      particles: string[];
      heroBg: [number, number, number];
      education: [number, number, number];
      finance: [number, number, number];
      corporate: [number, number, number];
    };
    light: {
      primary: string;
      secondary: string;
      accent: string;
      tertiary: string;
      particles: string[];
      heroBg: [number, number, number];
      education: [number, number, number];
      finance: [number, number, number];
      corporate: [number, number, number];
    };
  };
}

/**
 * THEME 02 — OBSIDIAN BRONZE
 * Official permanent design system for OmniAgent.
 * Palette:
 * - Deep blue-black: #0B1118
 * - Slate: #3D4D55
 * - Warm grey: #A79E9C
 * - Warm off-white: #D3C3B9
 * - Bronze: #B58863
 * - Deep neutral black: #161616
 */
export const OBSIDIAN_BRONZE_THEME: ThemeDefinition = {
  id: "theme-02",
  name: "THEME 02 — OBSIDIAN BRONZE",
  tagline: "Sophisticated Deep Navy, Warm Neutral & Burnished Bronze",
  badge: "Obsidian Bronze",
  swatches: ["#0B1118", "#3D4D55", "#A79E9C", "#D3C3B9", "#B58863", "#161616"],
  tokens: {
    dark: {
      "--background": [213, 37, 7],       // #0B1118 Deep Navy Obsidian
      "--foreground": [24, 24, 88],       // #EBE2DC Warm Alabaster White
      "--card": [210, 28, 12],            // #16212B Deep Navy Surface
      "--card-foreground": [24, 24, 88],
      "--popover": [210, 28, 12],
      "--popover-foreground": [24, 24, 88],
      "--primary": [27, 48, 55],          // #C98952 Warm Bronze Amber
      "--primary-foreground": [0, 0, 100],
      "--secondary": [200, 16, 36],       // #4D606A Slate Navy
      "--secondary-foreground": [0, 0, 100],
      "--muted": [210, 24, 16],           // #1F2B36 Muted Navy Fill
      "--muted-foreground": [11, 8, 63],  // #A89E9B Warm Clay Gray
      "--accent": [34, 40, 70],           // #D8BAA0 Radiant Bronze Sand
      "--accent-foreground": [213, 37, 7],
      "--border": [210, 20, 19],          // #27333E Deep Navy Border
      "--input": [210, 20, 19],
      "--ring": [27, 48, 55],
    },
    light: {
      "--background": [34, 35, 95],       // #F7F3EE Warm Linen Cream
      "--foreground": [215, 44, 10],      // #0E1724 Deep Navy Charcoal
      "--card": [0, 0, 100],              // #FFFFFF Clean Warm White
      "--card-foreground": [215, 44, 10],
      "--popover": [0, 0, 100],
      "--popover-foreground": [215, 44, 10],
      "--primary": [26, 44, 42],          // #9A5E30 Burnished Deep Bronze
      "--primary-foreground": [0, 0, 100],
      "--secondary": [200, 16, 29],       // #3D4D55 Slate Navy
      "--secondary-foreground": [0, 0, 100],
      "--muted": [30, 25, 90],            // #EBE4DC Soft Sand Fill
      "--muted-foreground": [11, 12, 44], // #7E6B65 Warm Slate Clay
      "--accent": [27, 48, 52],           // #BF7B43 Warm Ochre
      "--accent-foreground": [0, 0, 100],
      "--border": [24, 20, 80],           // #D5C8BF Warm Linen Border
      "--input": [24, 20, 80],
      "--ring": [26, 44, 42],
    },
  },
  canvasPalette: {
    dark: {
      primary: "#C98952",
      secondary: "#4D606A",
      accent: "#D8BAA0",
      tertiary: "#A79E9C",
      particles: ["#C98952", "#D3C3B9", "#B58863", "#A79E9C", "#4D606A"],
      heroBg: [11, 17, 24],               // #0B1118
      education: [211, 195, 185],         // #D3C3B9
      finance: [181, 136, 99],            // #B58863
      corporate: [167, 158, 156],         // #A79E9C
    },
    light: {
      primary: "#9A5E30",
      secondary: "#3D4D55",
      accent: "#BF7B43",
      tertiary: "#7E6B65",
      particles: ["#9A5E30", "#3D4D55", "#B58863", "#A79E9C", "#D3C3B9"],
      heroBg: [247, 243, 238],            // #F7F3EE
      education: [61, 77, 85],            // #3D4D55
      finance: [154, 94, 48],             // #9A5E30
      corporate: [181, 136, 99],          // #B58863
    },
  },
};

export type ThemeVariantId = "theme-02";
export type ThemeVariantDefinition = ThemeDefinition;

export const THEME_VARIANTS: Record<string, ThemeDefinition> = {
  "theme-02": OBSIDIAN_BRONZE_THEME,
};
