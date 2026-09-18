import React from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Code2,
  Cpu,
  Layers,
  Lock,
  MessageSquare,
  Network,
  Plug,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";

const capabilities = [
  {
    icon: Network,
    title: "Multi-Agent Topology Graph",
    desc: "Coordinate specialized agents (Ingestion, Policy Reasoner, Tool Dispatcher) with explicit state boundaries and asynchronous message channels.",
    badge: "Architecture",
    badgeStyle: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    icon: Code2,
    title: "Deterministic Compilation Engine",
    desc: "Transforms fuzzy user prompts into strictly-typed JSON Intermediate Representation (IR) schemas with verified parameter contracts.",
    badge: "Reliability",
    badgeStyle: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    icon: Terminal,
    title: "Interactive Sandbox Canvas",
    desc: "Inspect live node variables, simulate external webhook triggers, and verify conditional execution branches before deployment.",
    badge: "Testing",
    badgeStyle: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    icon: Lock,
    title: "Encrypted Credential Isolation",
    desc: "OAuth tokens for Gmail, Slack, Notion, and databases are stored in encrypted per-tenant vaults with zero credential exposure to LLMs.",
    badge: "Security",
    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    icon: Plug,
    title: "Native Tool Ecosystem",
    desc: "Pre-wired support for 50+ integrations across communication, CRM, storage, vector databases, and AI inference providers.",
    badge: "Ecosystem",
    badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    icon: RefreshCw,
    title: "Natural Language Evolution",
    desc: "Modify deployed agents using conversational diffs. OmniAgent generates side-by-side comparison previews and version rollback trees.",
    badge: "Lifecycle",
    badgeStyle: "bg-blue-50 text-blue-700 border-blue-200",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-28 bg-white text-slate-900 border-t border-slate-200/80 relative">
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
          <Zap className="size-3.5 text-sky-600" />
          <span>Technical Capabilities</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight">
          Built For <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">Developer-Grade Automation</span>
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          The power of no-code generation combined with the precision, verifiability, and auditability of enterprise codebases.
        </p>
      </motion.div>

      {/* 6-Card Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {capabilities.map((cap, i) => {
          const Icon = cap.icon;
          return (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="group rounded-2xl border border-slate-200/90 bg-white p-6 hover:border-sky-400/80 hover:shadow-lg transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-sky-50 border border-sky-200/80 text-sky-600 group-hover:scale-105 transition-transform">
                    <Icon className="size-5" />
                  </div>
                  <span className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cap.badgeStyle}`}>
                    {cap.badge}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 mb-2">{cap.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{cap.desc}</p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span className="text-sky-600 font-semibold">Core Capability</span>
                <span className="text-emerald-600 font-semibold">✓ Verified</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
