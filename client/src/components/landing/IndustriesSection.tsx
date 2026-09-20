import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Landmark,
  Building2,
  Cpu,
  Database,
  Search,
  FileCheck2,
  LineChart,
  ShieldCheck,
  Send,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface IndustryData {
  id: string;
  label: string;
  icon: React.ElementType;
  tagline: string;
  description: string;
  nodes: {
    title: string;
    type: string;
    icon: React.ElementType;
    badge: string;
    details: string;
  }[];
  metrics: {
    label: string;
    val: string;
  }[];
  samplePrompt: string;
}

const INDUSTRIES: IndustryData[] = [
  {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    tagline: "Adaptive Curriculum & Student Intelligence",
    description:
      "Autonomous grading, personalized learning path synthesizers, and intelligent institutional analytics deployed seamlessly.",
    samplePrompt: "Synthesize personalized 12-week quantum physics track from raw syllabus and student diagnostic quiz.",
    metrics: [
      { label: "Grading Speedup", val: "94%" },
      { label: "Curriculum Accuracy", val: "99.8%" },
      { label: "Active Pipelines", val: "1.2k+" }
    ],
    nodes: [
      {
        title: "Ingestion & OCR",
        type: "Data Layer",
        icon: Database,
        badge: "Vector RAG",
        details: "Extracts PDFs, lecture recordings, and assignment rubrics into FAISS index."
      },
      {
        title: "Adaptive Assessor",
        type: "Agent Pod",
        icon: Cpu,
        badge: "LLM Reasoning",
        details: "Evaluates mastery gaps, scores submissions, and synthesizes targeted remediations."
      },
      {
        title: "LMS Sync & Reporting",
        type: "Action Node",
        icon: Send,
        badge: "Webhook API",
        details: "Dispatches grades, custom feedback, and student progress alerts to Canvas / Moodle."
      }
    ]
  },
  {
    id: "finance",
    label: "Finance",
    icon: Landmark,
    tagline: "Deterministic Risk & Real-time Compliance",
    description:
      "Automated financial statement auditing, algorithmic reconciliation, and SEC Edgar filing synthesis with zero hallucination.",
    samplePrompt: "Cross-examine 10-K disclosures against Q3 ledgers and highlight liquidity variances > 2.5%.",
    metrics: [
      { label: "Audit Latency", val: "1.8s" },
      { label: "Zero-Hallucination", val: "100%" },
      { label: "Reconciliation Volume", val: "$48M/day" }
    ],
    nodes: [
      {
        title: "Ledger Ingestion",
        type: "Data Layer",
        icon: Database,
        badge: "Encrypted Vault",
        details: "Streams real-time ERP feeds and banking transaction schemas securely."
      },
      {
        title: "Risk & Forensic Auditor",
        type: "Agent Pod",
        icon: ShieldCheck,
        badge: "IR Engine",
        details: "Executes rule-governed validation models against tax codes and accounting standards."
      },
      {
        title: "SEC & Board Artifacts",
        type: "Action Node",
        icon: LineChart,
        badge: "Automated Report",
        details: "Compiles formatted audit memos, anomaly alerts, and executive summary packages."
      }
    ]
  },
  {
    id: "corporate",
    label: "Corporate",
    icon: Building2,
    tagline: "Autonomous Operations & SLA Orchestration",
    description:
      "Cross-department ticket routing, contract review bots, vendor onboarding pipelines, and CRM state synchronization.",
    samplePrompt: "Extract indemnity clauses from vendor MSAs and route SLA breaches directly to Legal Slack channel.",
    metrics: [
      { label: "Ticket Resolution", val: "88% Auto" },
      { label: "SLA Adherence", val: "99.9%" },
      { label: "Cycle Time Saved", val: "14 hrs/wk" }
    ],
    nodes: [
      {
        title: "Multi-Source Intake",
        type: "Data Layer",
        icon: Search,
        badge: "Omni Webhook",
        details: "Aggregates incoming Zendesk tickets, vendor emails, and contract attachments."
      },
      {
        title: "Contract & SLA Arbiter",
        type: "Agent Pod",
        icon: FileCheck2,
        badge: "Multi-Agent Pool",
        details: "Classifies severity, checks contractual liabilities, and assigns priority tiers."
      },
      {
        title: "ERP & Jira Dispatch",
        type: "Action Node",
        icon: Send,
        badge: "n8n Workflow",
        details: "Updates CRM accounts, creates engineering tickets, and triggers approval webhooks."
      }
    ]
  }
];

export const IndustriesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("education");

  const current = INDUSTRIES.find((i) => i.id === activeTab) || INDUSTRIES[0];
  const IconComponent = current.icon;

  return (
    <section id="industries" className="relative py-28 px-4 sm:px-6 lg:px-8 bg-background border-t border-border/40 overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>03 — DOMAIN BLUEPRINTS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            One Platform. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">Multiple Domains.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            OmniAgent compiles specialized agent graphs configured for the regulatory, analytical, and operational needs of your specific domain.
          </p>
        </div>

        {/* Domain Selector Pills */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1.5 rounded-2xl bg-card border border-border/70 shadow-sm backdrop-blur-md">
            {INDUSTRIES.map((ind) => {
              const TabIcon = ind.icon;
              const isActive = activeTab === ind.id;
              return (
                <button
                  key={ind.id}
                  onClick={() => setActiveTab(ind.id)}
                  className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                    isActive
                      ? "text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="industryTabGlow"
                      className="absolute inset-0 bg-primary rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <TabIcon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{ind.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Interactive Canvas */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-xl p-6 sm:p-8 lg:p-10"
          >
            {/* Top Overview & Prompt Box */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-8 border-b border-border/60">
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                      {current.tagline}
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground">Domain Preset: {current.label.toUpperCase()}_v2</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {current.description}
                </p>
              </div>

              {/* Sample Intent Box */}
              <div className="lg:col-span-6 rounded-2xl bg-muted/30 border border-border/70 p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Target Execution Intent
                  </div>
                  <p className="text-xs sm:text-sm font-mono text-foreground/90 bg-background/60 p-3 rounded-lg border border-border/40">
                    &quot;{current.samplePrompt}&quot;
                  </p>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-3 pt-4 mt-2 border-t border-border/40">
                  {current.metrics.map((m, idx) => (
                    <div key={idx} className="text-center sm:text-left">
                      <div className="text-xs font-medium text-muted-foreground">{m.label}</div>
                      <div className="text-lg font-bold text-primary tracking-tight">{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Architecture Node Flow */}
            <div className="pt-8">
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6 flex items-center justify-between">
                <span>Compiled Architecture Pipeline</span>
                <span className="text-primary text-[11px] flex items-center gap-1 font-sans">
                  Active Blueprint <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
                {current.nodes.map((node, idx) => {
                  const NodeIcon = node.icon;
                  return (
                    <div
                      key={idx}
                      className="group relative rounded-2xl border border-border/80 bg-background/80 hover:border-primary/50 transition-all duration-300 p-5 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <NodeIcon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted/70 text-muted-foreground border border-border/60">
                            {node.badge}
                          </span>
                        </div>
                        <div>
                          <div className="text-[11px] font-mono text-primary font-medium">{node.type}</div>
                          <h4 className="text-base font-semibold text-foreground mt-0.5">{node.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {node.details}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span>Stage 0{idx + 1}</span>
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ready
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
