import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Workflow, 
  Sparkles, 
  Cpu, 
  FileCode2, 
  Layers, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";

interface PipelineStage {
  step: string;
  title: string;
  desc: string;
  icon: typeof Sparkles;
  tag: string;
}

const stages: PipelineStage[] = [
  {
    step: "01",
    title: "Intent Extraction",
    desc: "Extracts objectives, target schemas, and operational constraints from conversational prompts.",
    icon: Sparkles,
    tag: "Natural Language",
  },
  {
    step: "02",
    title: "Agent Generation",
    desc: "Dynamically configures specialized agent personas, system prompts, and tool attachments.",
    icon: Cpu,
    tag: "Domain Model",
  },
  {
    step: "03",
    title: "Workflow Compilation",
    desc: "Synthesizes deterministic, type-checked IR graphs and executable n8n engine blueprints.",
    icon: FileCode2,
    tag: "IR Schema v2.4",
  },
  {
    step: "04",
    title: "Multi-Agent Orchestration",
    desc: "Coordinates parallel execution branches, citation verification, and strict compliance guardrails.",
    icon: Layers,
    tag: "Async Dispatch",
  },
  {
    step: "05",
    title: "Execution & Verification",
    desc: "Executes live API actions with encrypted credential isolation and deterministic audit logs.",
    icon: CheckCircle2,
    tag: "Production Runtime",
  },
];

export const OrchestrationSection: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(0);

  return (
    <section id="orchestration" className="py-24 sm:py-32 bg-muted/20 text-foreground relative overflow-hidden border-t border-border/80">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16 sm:mb-20"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1 text-xs font-mono font-semibold text-sky-600 dark:text-sky-400 mb-3 shadow-xs">
            <Workflow className="size-3.5 text-sky-500" />
            <span>Autonomous Pipeline</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-3 leading-tight">
            From Intent <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">to Execution.</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Watch how natural language compiles into deterministic, audit-ready multi-agent workflows.
          </p>
        </motion.div>

        {/* Dominant Visual: Interactive Pipeline Ribbon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          {/* Desktop Horizontal Stages & Connecting Track */}
          <div className="relative mb-8">
            {/* Background connecting track line */}
            <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 bg-border -translate-y-1/2 z-0" />
            
            {/* Animated continuous pulse beam */}
            <motion.div
              animate={{ left: ["4%", "96%", "4%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="hidden lg:block absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-primary shadow-[0_0_12px_#38BDF8] z-0"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
              {stages.map((stage, idx) => {
                const Icon = stage.icon;
                const isSelected = activeStage === idx;
                return (
                  <div
                    key={stage.step}
                    onMouseEnter={() => setActiveStage(idx)}
                    onClick={() => setActiveStage(idx)}
                    className={`rounded-2xl border transition-all duration-300 p-5 cursor-pointer flex flex-col justify-between select-none ${
                      isSelected
                        ? "bg-card border-primary shadow-lg ring-2 ring-primary/20"
                        : "bg-card/70 border-border hover:border-border/90 hover:bg-card"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`flex size-10 items-center justify-center rounded-xl border ${
                          isSelected ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted/40 border-border text-muted-foreground"
                        }`}>
                          <Icon className="size-5" />
                        </div>
                        <span className={`font-mono text-xs font-bold ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`}>
                          {stage.step}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-foreground mb-1.5">{stage.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {stage.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground">{stage.tag}</span>
                      {isSelected && <span className="text-primary font-bold">● Active</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Stage Detail Visualizer */}
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-6 sm:p-8 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-primary font-bold">
                    Stage {stages[activeStage].step} Architecture Focus
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {stages[activeStage].title} — {stages[activeStage].tag}
                  </div>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                {stages[activeStage].desc}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default OrchestrationSection;
