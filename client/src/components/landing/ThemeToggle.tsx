import React from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useSiteTheme } from "../../context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  variant?: "header" | "mobile";
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = "",
  variant = "header",
}) => {
  const { landingTheme, setLandingTheme, toggleTheme } = useSiteTheme();
  const isDark = landingTheme === "dark";

  // Proportional metrics:
  // Header: 58px x 30px track, 3px padding, 24px x 24px thumb, 28px slide travel
  // Mobile: 66px x 34px track, 4px padding, 26px x 26px thumb, 32px slide travel
  const isMobile = variant === "mobile";
  const slideDistance = isMobile ? 32 : 28;

  return (
    <div
      role="radiogroup"
      aria-label="Select landing page theme"
      title={isDark ? "Landing theme: Dark (Hero: Light)" : "Landing theme: Light (Hero: Dark)"}
      onClick={toggleTheme}
      className={`relative inline-flex items-center rounded-full border transition-colors duration-200 select-none cursor-pointer ${
        isMobile ? "h-[34px] w-[66px] p-1" : "h-[30px] w-[58px] p-[3px]"
      } ${
        isDark
          ? "border-slate-800/90 bg-[#0B1118]"
          : "border-[#D6CEBE]/90 bg-[#EAE4DC]"
      } ${className}`}
    >
      {/* Smooth Sliding Active Circular Thumb */}
      <motion.div
        initial={false}
        animate={{ x: isDark ? slideDistance : 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`absolute rounded-full pointer-events-none z-0 transition-colors duration-200 ${
          isMobile
            ? "left-1 top-1 size-[26px]"
            : "left-[3px] top-[3px] size-6"
        } ${
          isDark
            ? "bg-[#182333] shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
            : "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
        }`}
      />

      {/* Two balanced icon positions */}
      <div className={`relative z-10 flex items-center w-full justify-between ${isMobile ? "gap-1.5" : "gap-1"}`}>
        {/* Sun Position */}
        <button
          type="button"
          role="radio"
          aria-checked={!isDark}
          aria-label="Switch landing page to light theme"
          title="Light landing theme (Dark hero)"
          onClick={(e) => {
            e.stopPropagation();
            setLandingTheme("light");
          }}
          className={`flex items-center justify-center rounded-full bg-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
            isMobile ? "size-[26px]" : "size-6"
          } ${
            !isDark
              ? "text-amber-600 opacity-100"
              : "text-slate-400 opacity-60 hover:opacity-90 hover:text-slate-200"
          }`}
        >
          <Sun className="size-3.5" />
        </button>

        {/* Moon Position */}
        <button
          type="button"
          role="radio"
          aria-checked={isDark}
          aria-label="Switch landing page to dark theme"
          title="Dark landing theme (Light hero)"
          onClick={(e) => {
            e.stopPropagation();
            setLandingTheme("dark");
          }}
          className={`flex items-center justify-center rounded-full bg-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
            isMobile ? "size-[26px]" : "size-6"
          } ${
            isDark
              ? "text-amber-400 opacity-100"
              : "text-stone-500 opacity-60 hover:opacity-90 hover:text-stone-700"
          }`}
        >
          <Moon className="size-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ThemeToggle;
