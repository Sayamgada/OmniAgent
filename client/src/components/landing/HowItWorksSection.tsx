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
  <section id="how-it-works" className="py-28 bg-slate-50 text-slate-900 border-t border-slate-200/80 relative">
    <div className="container mx-auto px-4 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-mono font-semibold text-sky-700 mb-3 shadow-xs">
          <Workflow className="size-3.5 text-sky-600" />
          <span>Execution Lifecycle</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight">
          How OmniAgent <span className="bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">Compiles Workflows</span>
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
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
              className="relative rounded-2xl border border-slate-200/90 bg-white p-6 flex flex-col justify-between hover:border-sky-400/80 hover:shadow-lg transition-all group shadow-sm"
            >
              <div>
                {/* Step Top Bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-sky-50 border border-sky-200/80 text-sky-600 group-hover:scale-105 transition-transform">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-sky-700 px-2.5 py-0.5 rounded-md border border-sky-200 bg-sky-50">
                    STAGE {stage.step}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1">{stage.title}</h3>
                <p className="font-mono text-[11px] text-slate-500 mb-3">{stage.subtitle}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{stage.desc}</p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {stage.tags.map((t) => (
                    <span key={t} className="rounded bg-slate-50 border border-slate-200 px-2 py-0.5 font-mono text-[9px] text-slate-600 font-medium">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-emerald-600 font-semibold truncate">
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
