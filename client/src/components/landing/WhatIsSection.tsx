import { motion } from "framer-motion";
import { MessageSquare, Globe, Code2, FlaskConical } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Natural Language Prompting",
    desc: "Describe what your agent should do in plain language. OmniAgent decomposes your intent into execution steps.",
  },
  {
    icon: Globe,
    title: "Domain Intelligence",
    desc: "Pre-tuned for Corporate Operations, Education, and Finance with domain-specific guardrails and logic.",
  },
  {
    icon: Code2,
    title: "Transparent IR Schema",
    desc: "Inspect the generated intermediate representation in formatted JSON or edit compiled workflows directly.",
  },
  {
    icon: FlaskConical,
    title: "Interactive Sandbox Graph",
    desc: "Visualize multi-agent communication on a node canvas, inspect variables, and test before live deployment.",
  },
];

const WhatIsSection = () => (
  <section id="about" className="py-20 border-t border-border/60 bg-background/50 relative">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Engineered for <span className="gradient-text">Clarity & Control</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
          OmniAgent bridges natural human intent with deterministic API execution. No black boxes, just verifiable automation pipelines.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="rounded-xl border border-border bg-card/70 p-5 hover:border-primary/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
              <f.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm mb-2 text-foreground">{f.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhatIsSection;
