import { motion } from "framer-motion";
import { Network, Sparkles, MessageCircle, Brain, Plug, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: Network,
    title: "Multi-Agent Orchestration",
    desc: "Coordinate specialized LLM agents (extractors, summarizers, planners) with structured communication graph topologies.",
  },
  {
    icon: Sparkles,
    title: "Deterministic Compilation",
    desc: "Transforms fuzzy user prompts into executable JSON IR schemas with validated argument types and error states.",
  },
  {
    icon: MessageCircle,
    title: "Direct Sandbox Testing",
    desc: "Test agent responses, simulated payloads, and execution outputs directly within an integrated sandbox.",
  },
  {
    icon: Brain,
    title: "Context & Memory Management",
    desc: "Maintain task context and execution variables across intermediate steps and external system calls.",
  },
  {
    icon: Plug,
    title: "OAuth & Native Integrations",
    desc: "Direct connections to Gmail, Google Calendar, Slack, Notion, and webhooks with secure credential isolation.",
  },
  {
    icon: ShieldCheck,
    title: "Transparent & Auditable",
    desc: "Inspect every decision node, tool call payload, and LLM reasoning step with full JSON visibility.",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-20 border-t border-border/60 bg-background/50 relative">
    <div className="container mx-auto px-4 sm:px-6 relative">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Platform <span className="gradient-text">Capabilities</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
          Built for teams requiring developer-grade precision with the speed of no-code generation.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="rounded-xl border border-border bg-card/70 p-5 hover:border-primary/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3.5 text-primary">
              <f.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm mb-1.5 text-foreground">{f.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
