import React from "react";
import { motion } from "framer-motion";
import { Bot, Code2, Cpu, FileJson, Layers, Network, ShieldCheck, Sparkles, Workflow } from "lucide-react";

const platformPillars = [
  {
    icon: Code2,
    title: "Natural Intent Decomposition",
    desc: "Transforms fuzzy user objectives into typed intermediate schemas with validated input/output contracts.",
    badge: "Deterministic",
  },
  {
    icon: Network,
    title: "Multi-Agent Graph Orchestration",
    desc: "Coordinates specialized roles—extractors, summarizers, rule evaluators—in transparent DAG topologies.",
    badge: "Multi-Agent",
  },
  {
    icon: FileJson,
    title: "Transparent IR Schemas",
    desc: "Inspect, edit, and audit the complete JSON schema representation before any deployment or tool execution.",
    badge: "Verifiable",
  },
  {
    icon: ShieldCheck,
    title: "Isolated Credential Runtime",
    desc: "OAuth tokens and API keys are isolated in encrypted per-tenant vaults with zero credential leakage.",
    badge: "Enterprise",
  },
];

const WhatIsSection = () => (
  <section id="about" className="py-28 bg-[#06090F] relative overflow-hidden">
    {/* Atmospheric light source connecting from the expanding AI Core above */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] bg-primary/12 rounded-full blur-[180px] pointer-events-none" />

    {/* Subtle top radiant gradient border */}
    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

    <div className="container mx-auto px-4 sm:px-6 relative z-10">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-medium text-primary mb-4 shadow-sm">
          <Sparkles className="size-3.5" />
          <span>Engineered For Precision</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
          Deterministic Automation. <br />
          <span className="bg-gradient-to-r from-primary via-cyan-300 to-white bg-clip-text text-transparent">
            Zero Black Boxes.
          </span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Traditional AI gives unpredictable text. OmniAgent translates human intent into structured intermediate representations (IR), compiles verifiable node graphs, and dispatches real API actions.
        </p>
      </motion.div>

      {/* Grid of Core Architecture Pillars */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {platformPillars.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group relative rounded-2xl border border-border/80 bg-card/80 p-5 hover:border-primary/50 transition-all flex flex-col justify-between backdrop-blur-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary group-hover:scale-105 transition-transform">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-border bg-background/60 text-muted-foreground font-semibold">
                    {p.badge}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-foreground mb-2">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span className="text-primary font-medium">Layer 0{i + 1}</span>
                <span>Active Spec</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default WhatIsSection;
