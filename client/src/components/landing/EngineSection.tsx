import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  Terminal,
  Database,
  Workflow,
  KeyRound,
  CheckCircle2,
  Code2,
  Sparkles
} from "lucide-react";

interface TechComponent {
  id: string;
  name: string;
  badge: string;
  role: string;
  description: string;
  specs: { label: string; value: string }[];
  codeSnippet: string;
}

const ENGINE_SPECS: TechComponent[] = [
  {
    id: "fastapi",
    name: "FastAPI Core Engine",
    badge: "Core Backend",
    role: "Async Orchestrator & State Machine",
    description:
      "High-throughput asynchronous Python micro-core managing agent lifecycles, streaming state diffs, and real-time execution graphs.",
    specs: [
      { label: "Throughput", value: "10,000+ req/sec" },
      { label: "Async Runtime", value: "uvloop / Python 3.11" },
      { label: "Latency Overhead", value: "< 4ms" }
    ],
    codeSnippet: `@router.post("/orchestrate")
async def execute_agent_graph(
    intent: UserIntent,
    vault: TenantVault = Depends(get_tenant_vault)
) -> ExecutionResult:
    graph = await core_compiler.synthesize(intent)
    return await runtime_engine.dispatch(graph, vault)`
  },
  {
    id: "ir-schema",
    name: "Deterministic IR Schema v2.4",
    badge: "Reliability",
    role: "Type-Safe Intermediate Representation",
    description:
      "Compiles unstructured user prompts into a deterministic, strictly-typed Abstract Syntax Tree, eliminating non-deterministic LLM failure modes.",
    specs: [
      { label: "Schema Validation", value: "Pydantic v2 / Zod" },
      { label: "Hallucination Trap", value: "AST Type Guards" },
      { label: "Serialization", value: "Zero-loss JSON-LD" }
    ],
    codeSnippet: `interface IRWorkflowAST {
  version: "2.4.0";
  pipelineId: string;
  nodes: Array<{
    id: string;
    agentRole: "researcher" | "auditor" | "executor";
    toolBindings: ToolRef[];
    fallbackPolicy: "retry" | "human_in_loop";
  }>;
}`
  },
  {
    id: "n8n",
    name: "n8n Automation Runtime",
    badge: "Workflow Execution",
    role: "Production-Grade Pipeline Runner",
    description:
      "Native workflow execution engine with 400+ built-in connectors, webhook triggers, and fault-tolerant distributed retries.",
    specs: [
      { label: "Connector Ecosystem", value: "400+ Enterprise Apps" },
      { label: "Execution Mode", value: "Queue / Worker Pool" },
      { label: "Idempotency", value: "Guaranteed exactly-once" }
    ],
    codeSnippet: `const execution = await n8nClient.workflows.run({
  workflowId: compiledGraph.n8nWorkflowId,
  data: { payload: sessionContext },
  options: { retryOnFail: true, maxTries: 3 }
});`
  },
  {
    id: "vault",
    name: "Per-Tenant Credential Vaults",
    badge: "Security",
    role: "Zero-Trust Secret Isolation",
    description:
      "Tenant-isolated hardware-grade secret storage with AES-256-GCM encryption. API keys and tokens never touch the public network or LLM context.",
    specs: [
      { label: "Encryption", value: "AES-256-GCM" },
      { label: "Isolation", value: "Per-Tenant Keyring" },
      { label: "Compliance", value: "SOC2 Type II / GDPR" }
    ],
    codeSnippet: `val cipher = AesGcmEngine.encrypt(
    plaintext = userApiKey,
    tenantKey = tenantVault.getOrDeriveKey(tenantId),
    associatedData = "omniagent-auth-v2"
)`
  }
];

export const EngineSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("fastapi");

  const current = ENGINE_SPECS.find((e) => e.id === activeTab) || ENGINE_SPECS[0];

  return (
    <section id="engine" className="relative py-28 px-4 sm:px-6 lg:px-8 bg-background border-t border-border/40 overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono uppercase tracking-widest mb-4">
            <Terminal className="w-3.5 h-3.5" />
            <span>04 — ARCHITECTURE & RUNTIME</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            Engineered for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">Production</span>.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Not a prompt wrapper. OmniAgent combines deterministic intermediate representations, async FastAPI orchestration, and enterprise execution runtimes.
          </p>
        </div>

        {/* Technical Architecture Interactive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Component Selector Tabs */}
          <div className="lg:col-span-5 flex flex-col gap-3 justify-center">
            {ENGINE_SPECS.map((comp) => {
              const isActive = activeTab === comp.id;
              return (
                <button
                  key={comp.id}
                  onClick={() => setActiveTab(comp.id)}
                  className={`text-left p-5 rounded-2xl border transition-all duration-300 relative group ${
                    isActive
                      ? "bg-card border-primary shadow-lg shadow-primary/5"
                      : "bg-card/40 border-border/70 hover:bg-card/80 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                      {comp.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                        isActive
                          ? "bg-primary/10 text-primary border-primary/20 font-medium"
                          : "bg-muted text-muted-foreground border-border/40"
                      }`}
                    >
                      {comp.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {comp.role}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right Column: Code & Specification Viewer */}
          <div className="lg:col-span-7 rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between shadow-xl">
            <div>
              {/* Header inside viewer */}
              <div className="flex items-center justify-between pb-6 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground tracking-tight">{current.name}</h3>
                    <p className="text-xs font-mono text-primary">{current.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Production Ready</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground my-6 leading-relaxed">
                {current.description}
              </p>

              {/* Live Code Window */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs text-zinc-300 shadow-inner overflow-x-auto">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500/80" />
                    <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
                    <span className="w-2 h-2 rounded-full bg-green-500/80" />
                  </span>
                  <span>{current.id}.ts / python</span>
                </div>
                <pre className="text-cyan-400/90 leading-relaxed font-mono">
                  <code>{current.codeSnippet}</code>
                </pre>
              </div>
            </div>

            {/* Technical Specs Footer */}
            <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-border/60">
              {current.specs.map((spec, i) => (
                <div key={i}>
                  <div className="text-[11px] font-mono text-muted-foreground uppercase">{spec.label}</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">{spec.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Verified Stack Badges Bar */}
        <div className="mt-16 pt-10 border-t border-border/40">
          <div className="text-center text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6">
            Verified Production Technology Stack
          </div>
          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6">
            {[
              { label: "FastAPI", desc: "Micro-Core Orchestrator" },
              { label: "n8n Runtime", desc: "Automated Execution Engine" },
              { label: "PostgreSQL", desc: "State & Log Persistence" },
              { label: "FAISS Vector", desc: "Contextual RAG Retrieval" },
              { label: "AES-256 Vaults", desc: "Isolated Tenant Storage" },
              { label: "IR Schema v2.4", desc: "Deterministic AST Engine" }
            ].map((stack, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-card border border-border/70 shadow-sm"
              >
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="text-left">
                  <span className="text-xs font-semibold text-foreground block">{stack.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{stack.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
