import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, RotateCcw, ArrowRight } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

const CLUTTER_ITEMS = [
  { id: 1, text: "Follow-ups", x: "-38%", y: "-35%", delay: 0 },
  { id: 2, text: "Research & Fact-checking", x: "36%", y: "-38%", delay: 0.1 },
  { id: 3, text: "Weekly Reports", x: "-42%", y: "15%", delay: 0.2 },
  { id: 4, text: "Calendar Scheduling", x: "40%", y: "20%", delay: 0.15 },
  { id: 5, text: "Manual Data Entry", x: "-25%", y: "-55%", delay: 0.25 },
  { id: 6, text: "Customer Requests", x: "28%", y: "-55%", delay: 0.3 },
  { id: 7, text: "Routine Analysis", x: "-32%", y: "45%", delay: 0.05 },
  { id: 8, text: "Content Formatting", x: "34%", y: "48%", delay: 0.35 },
];

export const ExperimentalSection04: React.FC = () => {
  const [isCleared, setIsCleared] = useState(false);
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  return (
    <section
      id="experiment-04"
      className="relative min-h-screen py-32 px-4 sm:px-6 lg:px-8 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Dev Label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>EXPERIMENT 04 — MENTAL CLUTTER TO CLARITY</span>
        </div>
      </div>

      {/* Ambient background aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-teal-500/5 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-5xl mx-auto w-full relative z-10 text-center">
        {/* Editorial Artistic Stage Container */}
        <div className="relative min-h-[500px] sm:min-h-[560px] flex flex-col items-center justify-center p-6 sm:p-12">
          {/* Floating Mental Clutter Phrases (Organic floating -> Gravitational dissolution) */}
          <AnimatePresence>
            {!isCleared &&
              CLUTTER_ITEMS.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 0.8,
                    scale: 1,
                    x: item.x,
                    y: item.y,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.1,
                    x: "0%",
                    y: "0%",
                    transition: { duration: 0.8, delay: item.delay, ease: "easeInOut" },
                  }}
                  transition={{ duration: 0.6, delay: item.delay }}
                  className="absolute pointer-events-none z-10 hidden sm:block"
                >
                  <span className="px-3.5 py-1.5 rounded-full bg-muted/60 text-muted-foreground/80 border border-border/50 text-xs sm:text-sm font-mono backdrop-blur-md shadow-xs">
                    {item.text}
                  </span>
                </motion.div>
              ))}
          </AnimatePresence>

          {/* Central Editorial Statement */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto relative z-20"
          >
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.08] mb-6">
              You don&apos;t need another tool.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
                You need fewer things to think about.
              </span>
            </h2>

            <AnimatePresence mode="wait">
              {isCleared ? (
                <motion.div
                  key="resolved"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <p className="text-lg sm:text-xl font-medium text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> OmniAgent coordinates the work. You focus on what matters.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setIsCleared(false)}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset Clutter
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="action"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                >
                  <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
                    Stop managing dozens of fragmented daily chores. Hand them to autonomous intelligence.
                  </p>
                  <button
                    onClick={() => setIsCleared(true)}
                    className="px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Clear Mental Clutter</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Spacious Metric Footnote */}
        <div className="pt-8 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs font-mono text-muted-foreground">
          <div>8+ Weekly Hours Reclaimed</div>
          <div>Zero Coordination Overhead</div>
          <div>100% Peace of Mind</div>
        </div>
      </div>
    </section>
  );
};
