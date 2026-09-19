import React from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useSiteTheme } from "../../context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  variant?: "header" | "mobile";
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "", variant = "header" }) => {
  const { siteTheme, toggleTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";
  const slideX = isDark ? 32 : 0;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-between rounded-full border p-1 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none select-none cursor-pointer ${
        isDark
          ? "border-slate-700/80 bg-slate-900/90 text-slate-400 hover:border-slate-600 shadow-inner"
          : "border-slate-200 bg-slate-100/90 text-slate-500 hover:border-slate-300 shadow-inner"
      } ${variant === "mobile" ? "h-9 w-18 px-1.5" : "h-8 w-16 px-1"} ${className}`}
    >
      {/* Sliding Active Indicator Pill */}
      <motion.div
        initial={false}
        animate={{ x: slideX }}
        transition={{ type: "spring", stiffness: 450, damping: 28 }}
        className={`absolute left-1 top-1 bottom-1 rounded-full shadow-md flex items-center justify-center transition-colors duration-200 ${
          isDark
            ? "bg-slate-800 border border-slate-700 text-sky-400"
            : "bg-white border border-slate-200 text-amber-500"
        } ${variant === "mobile" ? "size-7 left-1.5" : "size-6"}`}
      >
        <motion.div
          key={isDark ? "dark" : "light"}
          initial={{ scale: 0.7, rotate: isDark ? -30 : 30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
        </motion.div>
      </motion.div>

      {/* Static Sun icon on left */}
      <span className="flex size-6 items-center justify-center text-amber-500/70 pl-0.5 pointer-events-none">
        <Sun className="size-3" />
      </span>

      {/* Static Moon icon on right */}
      <span className="flex size-6 items-center justify-center text-sky-400/70 pr-0.5 pointer-events-none">
        <Moon className="size-3" />
      </span>
    </button>
  );
};

export default ThemeToggle;
