import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowDown, Sparkles, Zap, Shield, Clock } from "lucide-react";

export const OutcomeSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"before" | "after">("after");

  return (
    <section
      id="outcomes"
      className="relative py-32 px-4 sm:px-6 lg:px-8 bg-background border-t border-border/40 text-foreground transition-colors duration-350 overflow-hidden"
    >
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-primary/5 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>04 — THE OUTCOME</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Less orchestration.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              More execution.
            </span>
          </h2>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Stop stitching together isolated tools and prompt templates. OmniAgent manages the complexity so you can focus on results.
          </p>
        </motion.div>

        {/* Typographic Story & Interactive Outcome Canvas (NO Cards) */}
        <div className="relative rounded-3xl border border-border/70 bg-card/60 backdrop-blur-xl p-8 sm:p-14 lg:p-16 shadow-2xl overflow-hidden mb-16">
          {/* Top Interactive Switcher */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex p-1 rounded-full bg-muted/60 border border-border/60 backdrop-blur-md">
              <button
                onClick={() => setActiveTab("before")}
                className={`px-6 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  activeTab === "before"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Manual Coordination
              </button>
              <button
                onClick={() => setActiveTab("after")}
                className={`px-6 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  activeTab === "after"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                With OmniAgent
              </button>
            </div>
          </div>

          {/* Dynamic Transformation Content */}
          {activeTab === "before" ? (
            <motion.div
              key="before"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl mx-auto space-y-6 text-center"
            >
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground/70">
                Fragile Multi-Tool Hassle
              </div>
              <p className="text-xl sm:text-2xl font-medium text-foreground/80 leading-relaxed">
                Writing custom scripts, manually copying data across five SaaS tabs, fixing broken webhook integrations, and constantly troubleshooting edge cases.
              </p>
              <div className="pt-6 flex items-center justify-center gap-6 text-xs font-mono text-muted-foreground">
                <span className="line-through text-red-400">Hours wasted on glue code</span>
                <span className="line-through text-red-400">High maintenance burden</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="after"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl mx-auto space-y-6 text-center"
            >
              <div className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">
                Unified Autonomous Stream
              </div>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                One simple request turns into coordinated, verified execution across all your tools.
              </p>
              <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-semibold text-emerald-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> 90% Less Manual Work
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Zero Syntax Overhead
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Instant Deployment
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Spacious Typographic Stat Landmarks (Generous whitespace, NOT a card grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center pt-8 border-t border-border/40">
          <div className="space-y-2">
            <div className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">10x</div>
            <div className="text-sm font-semibold text-foreground">Faster Workflow Deployment</div>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              From initial thought to production-grade agents in seconds.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">100%</div>
            <div className="text-sm font-semibold text-foreground">Natural Language Control</div>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              No code required. Plain English commands turn into live systems.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">Zero</div>
            <div className="text-sm font-semibold text-foreground">Manual Maintenance</div>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Autonomous coordination and error handling built-in by default.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
