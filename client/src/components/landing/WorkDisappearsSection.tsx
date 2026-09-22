import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, RotateCcw } from "lucide-react";

interface ScatteredTask {
  id: number;
  text: string;
  initialX: number; // percentage (8 to 90)
  initialY: number; // percentage (10 to 88)
  delay: number;
  icon: string;
}

const INITIAL_TASKS: ScatteredTask[] = [
  { id: 1, text: "Read 48 emails", initialX: 14, initialY: 22, delay: 0, icon: "✉️" },
  { id: 2, text: "Check Q3 spreadsheet", initialX: 82, initialY: 20, delay: 0.1, icon: "📊" },
  { id: 3, text: "Search student records", initialX: 16, initialY: 66, delay: 0.2, icon: "🔍" },
  { id: 4, text: "Create weekly report", initialX: 84, initialY: 68, delay: 0.15, icon: "📑" },
  { id: 5, text: "Send client update", initialX: 28, initialY: 42, delay: 0.3, icon: "📤" },
  { id: 6, text: "Schedule 3 meetings", initialX: 74, initialY: 44, delay: 0.25, icon: "📅" },
  { id: 7, text: "Review vendor NDA", initialX: 20, initialY: 82, delay: 0.35, icon: "📝" },
  { id: 8, text: "Follow up with VIPs", initialX: 78, initialY: 84, delay: 0.4, icon: "💬" },
  { id: 9, text: "Triage support tickets", initialX: 50, initialY: 16, delay: 0.05, icon: "🎯" },
];

export const WorkDisappearsSection: React.FC = () => {
  const [phase, setPhase] = useState<"chaos" | "converging" | "calm">("chaos");
  const [cycleCount, setCycleCount] = useState(0);

  // Auto-cycle the Chaos -> Converging -> Calm animation
  useEffect(() => {
    const timer1 = setTimeout(() => {
      setPhase("converging");
    }, 2800);

    const timer2 = setTimeout(() => {
      setPhase("calm");
    }, 5200);

    const timer3 = setTimeout(() => {
      setPhase("chaos");
      setCycleCount((c) => c + 1);
    }, 9400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [cycleCount]);

  return (
    <section
      id="the-work-disappears"
      className="relative min-h-[92vh] py-28 px-4 sm:px-6 lg:px-8 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-between overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[200px] pointer-events-none" />

      {/* Subtle Full-Canvas Grid Texture */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="max-w-7xl mx-auto w-full relative z-10 flex flex-col items-center">
        {/* Restrained Single-Line Top Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto mb-6"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-tight">
            You describe the work.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              OmniAgent handles the rest.
            </span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Scattered manual tasks converge into seamless autonomous execution.
          </p>
        </motion.div>

        {/* Full-Width Unboxed Living Canvas Area */}
        <div className="relative w-full h-[460px] sm:h-[520px] lg:h-[560px] flex items-center justify-center">
          {/* Central OmniCore Intelligence Core Anchor */}
          <motion.div
            animate={{
              scale: phase === "converging" ? [1, 1.25, 1.1] : phase === "calm" ? 1.12 : 1,
              boxShadow:
                phase === "converging"
                  ? "0 0 65px rgba(56, 189, 248, 0.45)"
                  : phase === "calm"
                  ? "0 0 45px rgba(52, 211, 153, 0.35)"
                  : "0 0 25px rgba(56, 189, 248, 0.15)",
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="relative z-20 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-card/95 border border-primary/50 flex flex-col items-center justify-center shadow-2xl text-center p-2 backdrop-blur-xl"
          >
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-1">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-foreground">
              OmniCore
            </span>
            <span className="text-[10px] font-mono text-primary font-medium">
              {phase === "chaos" ? "Standby" : phase === "converging" ? "Absorbing" : "Resolved"}
            </span>

            {/* Ripple Pulse Rings */}
            {phase === "converging" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 2.6, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border border-primary/60 pointer-events-none"
              />
            )}
          </motion.div>

          {/* Floating Scattered Tasks (Free across section canvas) */}
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
                              duration: 1.3,
                              delay: task.delay,
                              ease: [0.32, 0, 0.67, 0],
                            },
                          }
                        : {
                            left: `${task.initialX}%`,
                            top: `${task.initialY}%`,
                            opacity: 1,
                            scale: 1,
                            y: [0, -8, 0],
                            transition: {
                              y: { duration: 3 + task.id * 0.4, repeat: Infinity, ease: "easeInOut" },
                              opacity: { duration: 0.4, delay: task.delay },
                            },
                          }
                    }
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
                  >
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/90 border border-border/80 shadow-lg backdrop-blur-md text-xs font-medium text-foreground whitespace-nowrap">
                      <span className="text-sm">{task.icon}</span>
                      <span>{task.text}</span>
                    </div>
                  </motion.div>
                );
              })}
          </AnimatePresence>

          {/* Calm State Result Deliverables (Appear smoothly after convergence) */}
          <AnimatePresence>
            {phase === "calm" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 flex flex-col justify-between pointer-events-none z-10 py-6"
              >
                {/* Top Status */}
                <div className="flex justify-between items-center text-xs font-mono text-emerald-400 px-4 sm:px-8">
                  <span className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> All Tasks Handled
                  </span>
                  <span>100% Coordinated</span>
                </div>

                {/* Bottom Finished Deliverables */}
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 px-4">
                  {[
                    "Emails Triaged & Drafted",
                    "Spreadsheets Reconciled",
                    "Meetings Scheduled on Calendar",
                    "Leadership Briefing Delivered",
                  ].map((res, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="px-4 py-2 rounded-xl bg-card/95 border border-emerald-500/40 shadow-xl text-xs font-semibold text-foreground flex items-center gap-2 backdrop-blur-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{res}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Replay Controller Note */}
        <div className="mt-4 flex items-center justify-between w-full text-xs text-muted-foreground font-mono">
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
