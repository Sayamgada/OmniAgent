import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, User, CheckCircle2, RotateCcw } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

export const HandoffSection: React.FC = () => {
  const [isHandedOff, setIsHandedOff] = useState(false);
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  return (
    <section
      id="handoff"
      className="relative min-h-screen py-32 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Dev Marker */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>04 · THE HANDOFF</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-tight">
            You don&apos;t have to
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              carry every task.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Hand it off. Keep moving.
          </p>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setIsHandedOff(!isHandedOff)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all cursor-pointer"
            >
              {isHandedOff ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Handoff</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Hand It Off Now</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Physical Delegation Across Viewport Stage */}
        <div className="relative h-[420px] sm:h-[460px] rounded-3xl border border-border/80 bg-card/60 backdrop-blur-2xl shadow-2xl p-6 sm:p-12 flex items-center justify-between overflow-hidden">
          {/* LEFT SIDE: The Person / Human Burden */}
          <div className="relative z-10 w-[30%] max-w-xs text-left">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              <User className="w-4 h-4 text-sky-400" />
              <span>You (The Human)</span>
            </div>
            <div className="p-4 rounded-2xl bg-background/80 border border-border/80 shadow-md">
              <div className="text-xs font-bold text-foreground">
                {isHandedOff ? "Relieved & Focused" : "Carrying The Task"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isHandedOff
                  ? "Your mental slate is clear. You are focused on high-impact strategy."
                  : "Reviewing 40 vendor contracts and reconciling ledgers manually."}
              </p>
            </div>
          </div>

          {/* CENTER: Luminous Handoff Corridor */}
          <div className="relative z-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center animate-pulse">
              <ArrowRight className="w-6 h-6 text-primary" />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-2">
              Handoff Portal
            </span>
          </div>

          {/* GLIDING TASK OBJECT (Physically delegates across viewport) */}
          <motion.div
            animate={{
              x: isHandedOff ? "160%" : "-160%",
              scale: isHandedOff ? 1.05 : 0.95,
            }}
            transition={{ type: "spring", stiffness: 90, damping: 14 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none w-64"
          >
            <div className="p-4 rounded-2xl bg-background border border-primary shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold uppercase text-primary">
                  {isHandedOff ? "Autonomous Execution" : "Manual Task"}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <h4 className="text-xs font-bold text-foreground">
                Vendor Contract Liability Review
              </h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isHandedOff ? "OmniAgent is resolving clauses..." : "Pending human review"}
              </p>
            </div>
          </motion.div>

          {/* RIGHT SIDE: OmniAgent Handled State */}
          <div className="relative z-10 w-[30%] max-w-xs text-right">
            <div className="flex items-center justify-end gap-2 text-xs font-mono uppercase tracking-widest text-emerald-400 mb-3">
              <span>OmniAgent</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="p-4 rounded-2xl bg-background/80 border border-emerald-500/40 shadow-md">
              <div className="text-xs font-bold text-foreground">
                {isHandedOff ? "Handled & Verified" : "Awaiting Task"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isHandedOff
                  ? "All 40 contracts parsed, indemnities checked, summary report delivered."
                  : "Standing by to take the operational burden off your plate."}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Emotional relief through seamless autonomous delegation.</span>
          <span className="text-primary flex items-center gap-1 font-sans">
            Effortless Handoff <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </section>
  );
};
