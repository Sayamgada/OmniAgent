import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Cpu, FileCode, Rocket, Sparkles, Workflow } from "lucide-react";

const pipelineStages = [
  {
    step: "01",
    title: "Domain & Intent Ingestion",
    subtitle: "Natural Language to Structured Context",
    desc: "State your objective in plain language. OmniAgent anchors your domain guardrails (Corporate, Education, Finance) and parses target entities.",
    icon: Sparkles,
    telemetry: "FAISS Vector Search · Cosine ≥ 0.75",
    tags: ["Intent Parsing", "Entity Extraction"],
  },
  {
    step: "02",
    title: "Multi-Agent Graph Extraction",
    subtitle: "Role Decomposition & Logic Wiring",
    desc: "Groq LLM extracts specialized worker nodes (Ingestion Agents, Reasoning Engines, Tool Dispatchers) and maps data flow dependencies.",
    icon: Cpu,
    telemetry: "Groq LLaMA 3.3 · Zero Hallucination",
    tags: ["Multi-Agent Roles", "DAG Construction"],
  },
  {
    step: "03",
    title: "IR Schema Compilation",
    subtitle: "Deterministic Validation & Type Checking",
    desc: "Generates an intermediate representation (IR) JSON schema. Every node argument, condition branch, and tool connection is validated against the registry.",
    icon: FileCode,
    telemetry: "Schema v2.4 · 100% Validated",
    tags: ["IR Schema", "Tool Parameter Spec"],
  },
  {
    step: "04",
    title: "Runtime Deployment to n8n",
    subtitle: "Production Automation Dispatch",
    desc: "One click compiles the IR schema directly into live n8n workflows with isolated OAuth credentials and webhook trigger endpoints.",
    icon: Rocket,
    telemetry: "n8n REST Engine · Live Webhooks",
    tags: ["OAuth Credential Vault", "Production API"],
  },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="py-28 bg-muted/30 text-foreground border-t border-border relative">
    <div className="container mx-auto px-4 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-semibold text-primary mb-3 shadow-xs">
          <Workflow className="size-3.5 text-primary" />
          <span>Execution Lifecycle</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
          How OmniAgent <span className="bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">Compiles Workflows</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          From conversational prompt to deployed multi-agent execution pipeline in four verifiable stages.
        </p>
      </motion.div>

      {/* 4-Stage Connected Pipeline Visualizer */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
        {pipelineStages.map((stage, i) => {
          const Icon = stage.icon;
          return (
            <motion.div
              key={stage.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="relative rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/50 hover:shadow-lg transition-all group shadow-sm"
            >
              <div>
                {/* Step Top Bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:scale-105 transition-transform">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-primary px-2.5 py-0.5 rounded-md border border-primary/20 bg-primary/10">
                    STAGE {stage.step}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-foreground mb-1">{stage.title}</h3>
                <p className="font-mono text-[11px] text-muted-foreground mb-3">{stage.subtitle}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{stage.desc}</p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-border/60 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {stage.tags.map((t) => (
                    <span key={t} className="rounded bg-muted/60 border border-border px-2 py-0.5 font-mono text-[9px] text-muted-foreground font-medium">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-emerald-500 font-semibold truncate">
                  ✓ {stage.telemetry}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
