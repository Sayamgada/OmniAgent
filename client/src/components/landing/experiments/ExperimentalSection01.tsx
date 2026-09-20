import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, RotateCcw, ArrowRight } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

interface ScatteredTask {
  id: number;
  text: string;
  initialX: number; // percentage (10 to 90)
  initialY: number; // percentage (15 to 85)
  delay: number;
  icon: string;
}

const INITIAL_TASKS: ScatteredTask[] = [
  { id: 1, text: "Read 48 emails", initialX: 12, initialY: 20, delay: 0, icon: "✉️" },
  { id: 2, text: "Check Q3 spreadsheet", initialX: 78, initialY: 18, delay: 0.1, icon: "📊" },
  { id: 3, text: "Search student records", initialX: 18, initialY: 68, delay: 0.2, icon: "🔍" },
  { id: 4, text: "Create weekly report", initialX: 82, initialY: 65, delay: 0.15, icon: "📑" },
  { id: 5, text: "Send client update", initialX: 25, initialY: 38, delay: 0.3, icon: "📤" },
  { id: 6, text: "Schedule 3 meetings", initialX: 72, initialY: 42, delay: 0.25, icon: "📅" },
  { id: 7, text: "Review vendor NDA", initialX: 14, initialY: 82, delay: 0.35, icon: "📝" },
  { id: 8, text: "Follow up with VIPs", initialX: 75, initialY: 80, delay: 0.4, icon: "💬" },
  { id: 9, text: "Triage support tickets", initialX: 45, initialY: 15, delay: 0.05, icon: "🎯" },
];

export const ExperimentalSection01: React.FC = () => {
  const [phase, setPhase] = useState<"chaos" | "converging" | "calm">("chaos");
  const [cycleCount, setCycleCount] = useState(0);
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  // Auto-cycle the Chaos -> Converging -> Calm animation
  useEffect(() => {
    const timer1 = setTimeout(() => {
      setPhase("converging");
    }, 2800);

    const timer2 = setTimeout(() => {
      setPhase("calm");
    }, 5400);

    const timer3 = setTimeout(() => {
      setPhase("chaos");
      setCycleCount((c) => c + 1);
    }, 9200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [cycleCount]);

  return (
    <section
      id="experiment-01"
      className="relative min-h-screen py-32 px-4 sm:px-6 lg:px-8 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Dev Label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>EXPERIMENT 01 — THE WORK DISAPPEARS</span>
        </div>
      </div>

      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-primary/5 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full relative z-10 flex flex-col items-center">
        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            You describe the work.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              OmniAgent handles the rest.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Watch scattered manual tasks converge into seamless autonomous execution.
          </p>
        </motion.div>

        {/* Phase Indicator Pills */}
        <div className="flex items-center gap-3 mb-8">
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono transition-all duration-500 ${
              phase === "chaos"
                ? "bg-red-500/15 text-red-400 border border-red-500/30"
                : "bg-muted/40 text-muted-foreground border border-border/40"
            }`}
          >
            01. Scattered Work
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono transition-all duration-500 ${
              phase === "converging"
                ? "bg-primary/20 text-primary border border-primary/40 animate-pulse"
                : "bg-muted/40 text-muted-foreground border border-border/40"
            }`}
          >
            02. OmniAgent Absorbs
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono transition-all duration-500 ${
              phase === "calm"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-muted/40 text-muted-foreground border border-border/40"
            }`}
          >
            03. Pure Clarity
          </span>
        </div>

        {/* Transformation Canvas / Interactive Arena */}
        <div className="relative w-full h-[420px] sm:h-[480px] rounded-3xl border border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden flex items-center justify-center p-6">
          {/* Subtle Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* Central OmniAgent Intelligence Core */}
          <motion.div
            animate={{
              scale: phase === "converging" ? [1, 1.25, 1.1] : phase === "calm" ? 1.15 : 1,
              boxShadow:
                phase === "converging"
                  ? "0 0 60px rgba(56, 189, 248, 0.45)"
                  : phase === "calm"
                  ? "0 0 40px rgba(52, 211, 153, 0.35)"
                  : "0 0 20px rgba(56, 189, 248, 0.15)",
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="relative z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-background border border-primary/40 flex flex-col items-center justify-center shadow-xl text-center p-2"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-1">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">
              OmniCore
            </span>
            <span className="text-[9px] font-mono text-primary">
              {phase === "chaos" ? "Standby" : phase === "converging" ? "Absorbing" : "Resolved"}
            </span>

            {/* Ripple Pulse Rings */}
            {phase === "converging" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border border-primary/60 pointer-events-none"
              />
            )}
          </motion.div>

          {/* Floating Scattered Tasks (Chaos -> Converging -> Disappearing) */}
          <AnimatePresence>
            {phase !== "calm" &&
              INITIAL_TASKS.map((task) => {
                const isConverging = phase === "converging";
                return (
                  <motion.div
                    key={`${cycleCount}-${task.id}`}
                    initial={{
                      left: `${task.initialX}%`,
                      top: `${task.initialY}%`,
                      opacity: 0,
                      scale: 0.8,
                    }}
                    animate={
                      isConverging
                        ? {
                            left: "50%",
                            top: "50%",
                            opacity: 0,
                            scale: 0.1,
                            transition: {
                              duration: 1.4,
                              delay: task.delay,
                              ease: [0.32, 0, 0.67, 0],
                            },
                          }
                        : {
                            left: `${task.initialX}%`,
                            top: `${task.initialY}%`,
                            opacity: 1,
                            scale: 1,
                            y: [0, -6, 0],
                            transition: {
                              y: { duration: 3 + task.id * 0.4, repeat: Infinity, ease: "easeInOut" },
                              opacity: { duration: 0.4, delay: task.delay },
                            },
                          }
                    }
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                  >
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 border border-border/80 shadow-md backdrop-blur-md text-xs font-medium text-foreground whitespace-nowrap hover:border-primary/50 transition-colors">
                      <span className="text-sm">{task.icon}</span>
                      <span>{task.text}</span>
                    </div>
                  </motion.div>
                );
              })}
          </AnimatePresence>

          {/* Calm State Result Artifacts (Appear smoothly after convergence) */}
          <AnimatePresence>
            {phase === "calm" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none z-10"
              >
                {/* Top Status */}
                <div className="flex justify-between items-center text-xs font-mono text-emerald-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> All 9 Tasks Coordinated
                  </span>
                  <span>100% Autonomous</span>
                </div>

                {/* Bottom Real Result Badges */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {[
                    "Emails Triaged & Drafted",
                    "Spreadsheet Reconciled",
                    "Meetings Placed on Calendar",
                    "Report Sent to Leadership",
                  ].map((res, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="px-4 py-2 rounded-xl bg-background/95 border border-emerald-500/40 shadow-lg text-xs font-semibold text-foreground flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{res}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Caption */}
        <div className="mt-8 flex items-center justify-between w-full text-xs text-muted-foreground font-mono">
          <span>Zero manual glue code required.</span>
          <button
            onClick={() => {
              setPhase("chaos");
              setCycleCount((c) => c + 1);
            }}
            className="flex items-center gap-1.5 text-primary hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Replay Transformation
          </button>
        </div>
      </div>
    </section>
  );
};
