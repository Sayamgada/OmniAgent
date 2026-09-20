import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Cpu, 
  Database, 
  Search, 
  Play, 
  CheckCircle2
} from "lucide-react";

interface AgentNode {
  id: "research" | "data" | "execution";
  name: string;
  role: string;
  tagline: string;
  icon: typeof Search;
  color: string;
  accentClass: string;
  glowClass: string;
  capabilities: string[];
}

const specializedAgents: AgentNode[] = [
  {
    id: "research",
    name: "Research Agent",
    role: "Deep Knowledge & RAG",
    tagline: "Synthesizes multi-source context & citation-backed validation",
    icon: Search,
    color: "#38BDF8",
    accentClass: "border-sky-500/40 bg-sky-500/10 text-sky-500",
    glowClass: "shadow-sky-500/20",
    capabilities: ["Vector RAG Retrieval", "Fact Verification", "Context Extraction"],
  },
  {
    id: "data",
    name: "Data & Logic Agent",
    role: "Schema & Rule Guardrails",
    tagline: "Enforces deterministic validation and strict compliance assertions",
    icon: Database,
    color: "#2DD4BF",
    accentClass: "border-teal-500/40 bg-teal-500/10 text-teal-500",
    glowClass: "shadow-teal-500/20",
    capabilities: ["Deterministic IR Schemas", "Policy Assertions", "Threshold Checks"],
  },
  {
    id: "execution",
    name: "Execution Agent",
    role: "n8n & API Orchestration",
    tagline: "Dispatches atomic actions to live tool APIs with isolated tokens",
    icon: Play,
    color: "#00F2FE",
    accentClass: "border-cyan-500/40 bg-cyan-500/10 text-cyan-500",
    glowClass: "shadow-cyan-500/20",
    capabilities: ["n8n Workflow Triggers", "Isolated Vault Tokens", "Real-Time Audit Logs"],
  },
];

export const TheCoreSection: React.FC = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  return (
    <section id="core" className="py-24 sm:py-32 bg-background text-foreground relative overflow-hidden border-t border-border/80">
      {/* Subtle background ambient mesh */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[400px] bg-primary/8 rounded-full blur-[140px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16 sm:mb-20"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-semibold text-primary mb-3 shadow-xs">
            <Cpu className="size-3.5" />
            <span>Core Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-3 leading-tight">
            One Core. <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">Infinite Specialized Agents.</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Turn natural-language intent into specialized, orchestrated AI agents tailored for real-world workflows.
          </p>
        </motion.div>

        {/* Dominant Visual Architecture Graph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto relative rounded-3xl border border-border/80 bg-card/60 backdrop-blur-xl p-6 sm:p-12 shadow-xl"
        >
          {/* Level 1: USER INTENT Input Badge */}
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-2.5 rounded-2xl border border-border bg-background/90 px-5 py-3 shadow-md">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="size-4" />
              </span>
              <div className="text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">User Intent Input</div>
                <div className="text-xs sm:text-sm font-bold text-foreground font-mono">"Reconcile monthly ledger & dispatch executive audit summary"</div>
              </div>
            </div>

            {/* Connecting Beam: Intent -> Core */}
            <div className="w-0.5 h-10 bg-gradient-to-b from-primary/80 to-sky-500 relative my-1">
              <motion.div
                animate={{ y: [0, 36, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-1 top-0 size-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_#38BDF8]"
              />
            </div>
          </div>

          {/* Level 2: CENTRAL OMNIAGENT AI CORE */}
          <div className="flex justify-center my-2">
            <div className="relative group cursor-pointer" onMouseEnter={() => setActiveNode("core")} onMouseLeave={() => setActiveNode(null)}>
              {/* Core Radiant Halo */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/30 via-cyan-500/30 to-teal-500/30 blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative rounded-2xl border-2 border-primary/50 bg-background px-6 py-4 shadow-lg flex items-center gap-3.5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/40">
                  <Cpu className="size-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-foreground tracking-tight">OMNIAGENT AI CORE</span>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      LIVE ENGINE
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">Orchestrates decomposition, guardrails & synthesis</div>
                </div>
              </div>
            </div>
          </div>

          {/* Level 3: Diverging Circuit Paths (Desktop SVG / Mobile Vertical) */}
          <div className="relative my-4">
            <svg className="w-full h-14 hidden md:block overflow-visible" viewBox="0 0 800 60" preserveAspectRatio="none">
              <path
                d="M 400 0 L 400 20 L 150 20 L 150 60"
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <path
                d="M 400 0 L 400 60"
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <path
                d="M 400 0 L 400 20 L 650 20 L 650 60"
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Traveling pulses */}
              <circle cx="400" cy="0" r="3" fill="#38BDF8">
                <animateMotion path="M 400 0 L 400 20 L 150 20 L 150 60" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx="400" cy="0" r="3" fill="#2DD4BF">
                <animateMotion path="M 400 0 L 400 60" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="400" cy="0" r="3" fill="#00F2FE">
                <animateMotion path="M 400 0 L 400 20 L 650 20 L 650 60" dur="2.6s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* Level 4: THREE SPECIALIZED AGENT PODS */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {specializedAgents.map((agent) => {
              const Icon = agent.icon;
              const isHovered = activeNode === agent.id;
              return (
                <div
                  key={agent.id}
                  onMouseEnter={() => setActiveNode(agent.id)}
                  onMouseLeave={() => setActiveNode(null)}
                  className={`rounded-2xl border transition-all duration-300 p-5 bg-background/80 shadow-sm flex flex-col justify-between ${
                    isHovered
                      ? `border-primary shadow-lg ${agent.glowClass}`
                      : "border-border hover:border-border/90"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex size-9 items-center justify-center rounded-xl border ${agent.accentClass}`}>
                        <Icon className="size-4.5" />
                      </div>
                      <span className="font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {agent.role}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-1">{agent.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{agent.tagline}</p>
                  </div>

                  <div className="pt-3 border-t border-border/60 flex flex-wrap gap-1">
                    {agent.capabilities.map((cap) => (
                      <span key={cap} className="rounded border border-border bg-muted/30 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Level 5: Converging Output Beam */}
          <div className="relative my-2">
            <svg className="w-full h-12 hidden md:block overflow-visible" viewBox="0 0 800 50" preserveAspectRatio="none">
              <path
                d="M 150 0 L 150 25 L 400 25 L 400 50"
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <path
                d="M 400 0 L 400 50"
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <path
                d="M 650 0 L 650 25 L 400 25 L 400 50"
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            </svg>
          </div>

          {/* Level 6: PRODUCTION OUTPUT NODE */}
          <div className="flex justify-center mt-2">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 shadow-md text-left">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">Production Execution Output</div>
                <div className="text-xs font-semibold text-foreground">Verified Multi-Agent Workflow Compiled & Executed via n8n Runtime</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TheCoreSection;
