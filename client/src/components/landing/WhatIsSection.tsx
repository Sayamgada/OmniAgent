import React from "react";
import { motion } from "framer-motion";
import { Code2, FileJson, Network, ShieldCheck, Sparkles } from "lucide-react";

const platformPillars = [
  {
    icon: Code2,
    title: "Natural Intent Decomposition",
    desc: "Transforms fuzzy user objectives into typed intermediate schemas with validated input/output contracts.",
    badge: "Deterministic",
    badgeStyle: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    icon: Network,
    title: "Multi-Agent Graph Orchestration",
    desc: "Coordinates specialized roles—extractors, summarizers, rule evaluators—in transparent DAG topologies.",
    badge: "Multi-Agent",
    badgeStyle: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    icon: FileJson,
    title: "Transparent IR Schemas",
    desc: "Inspect, edit, and audit the complete JSON schema representation before any deployment or tool execution.",
    badge: "Verifiable",
    badgeStyle: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    icon: ShieldCheck,
    title: "Isolated Credential Runtime",
    desc: "OAuth tokens and API keys are isolated in encrypted per-tenant vaults with zero credential leakage.",
    badge: "Enterprise",
    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

const WhatIsSection = () => (
  <section id="about" className="py-28 bg-background text-foreground relative overflow-hidden transition-colors duration-300">
    {/* Soft luminous radial ambient light bridging from the AI Core expansion */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[400px] bg-primary/10 rounded-full blur-[160px] pointer-events-none" />

    <div className="container mx-auto px-4 sm:px-6 relative z-10">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-semibold text-primary mb-4 shadow-xs">
          <Sparkles className="size-3.5 text-primary" />
          <span>Engineered For Precision</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
          Deterministic Automation. <br />
          <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
            Zero Black Boxes.
          </span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Traditional AI gives unpredictable text. OmniAgent translates human intent into structured intermediate representations (IR), compiles verifiable node graphs, and dispatches real API actions.
        </p>
      </motion.div>

      {/* Grid of Core Architecture Pillars */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
        {platformPillars.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group relative rounded-2xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:scale-105 transition-transform">
                    <Icon className="size-5" />
                  </div>
                  <span className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${p.badgeStyle}`}>
                    {p.badge}
                  </span>
                </div>
                <h3 className="font-bold text-base text-foreground mb-2">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span className="text-primary font-semibold">Layer 0{i + 1}</span>
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
