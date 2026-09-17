import { motion } from "framer-motion";
import { ArrowRight, Bot, Cpu, Database, FileCode, Layers, Play, Rocket, ShieldCheck, Sparkles, Workflow, Zap } from "lucide-react";

const pipelineStages = [
  {
    step: "01",
    title: "Domain & Intent Ingestion",
    subtitle: "Natural Language to Structured Context",
    desc: "You state an objective in plain language. OmniAgent anchors your domain guardrails (Corporate, Education, Finance) and parses target entities.",
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
  <section id="how-it-works" className="py-24 border-t border-border/80 bg-background/50 relative">
    <div className="container mx-auto px-4 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 text-xs font-mono font-medium text-primary mb-3">
          <Workflow className="size-3" />
          <span>Execution Lifecycle</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">
          How OmniAgent <span className="gradient-text">Compiles Workflows</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          From conversational prompt to deployed multi-agent execution pipeline in four verifiable stages.
        </p>
      </motion.div>

      {/* 4-Stage Connected Pipeline Visualizer */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {pipelineStages.map((stage, i) => {
          const Icon = stage.icon;
          return (
            <motion.div
              key={stage.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="relative rounded-2xl border border-border/80 bg-card/80 p-5 flex flex-col justify-between hover:border-primary/50 transition-all group"
            >
              <div>
                {/* Step Top Bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary group-hover:scale-105 transition-transform">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded-md border border-primary/25 bg-primary/10">
                    STAGE {stage.step}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-foreground mb-1">{stage.title}</h3>
                <p className="font-mono text-[11px] text-muted-foreground/90 mb-3">{stage.subtitle}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{stage.desc}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-border/60 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {stage.tags.map((t) => (
                    <span key={t} className="rounded bg-background/60 border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-emerald-400 truncate">
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
