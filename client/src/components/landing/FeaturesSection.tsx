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
  },
  {
    icon: Code2,
    title: "Deterministic Compilation Engine",
    desc: "Transforms fuzzy user prompts into strictly-typed JSON Intermediate Representation (IR) schemas with verified parameter contracts.",
    badge: "Reliability",
  },
  {
    icon: Terminal,
    title: "Interactive Sandbox Canvas",
    desc: "Inspect live node variables, simulate external webhook triggers, and verify conditional execution branches before deployment.",
    badge: "Testing",
  },
  {
    icon: Lock,
    title: "Encrypted Credential Isolation",
    desc: "OAuth tokens for Gmail, Slack, Notion, and databases are stored in encrypted per-tenant vaults with zero credential exposure to LLMs.",
    badge: "Security",
  },
  {
    icon: Plug,
    title: "Native Tool Ecosystem",
    desc: "Pre-wired support for 50+ integrations across communication, CRM, storage, vector databases, and AI inference providers.",
    badge: "Ecosystem",
  },
  {
    icon: RefreshCw,
    title: "Natural Language Evolution",
    desc: "Modify deployed agents using conversational diffs. OmniAgent generates side-by-side comparison previews and version rollback trees.",
    badge: "Lifecycle",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 border-t border-border/80 bg-background/50 relative">
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
          <Zap className="size-3" />
          <span>Technical Capabilities</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">
          Built For <span className="gradient-text">Developer-Grade Automation</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          The power of no-code generation combined with the precision, verifiability, and auditability of enterprise codebases.
        </p>
      </motion.div>

      {/* 6-Card High Information Density Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {capabilities.map((cap, i) => {
          const Icon = cap.icon;
          return (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="group rounded-2xl border border-border/80 bg-card/80 p-5 hover:border-primary/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary group-hover:scale-105 transition-transform">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-border bg-background/60 text-muted-foreground font-semibold">
                    {cap.badge}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-foreground mb-2">{cap.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{cap.desc}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span className="text-primary font-medium">Core Capability</span>
                <span className="text-emerald-400">Verified</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
