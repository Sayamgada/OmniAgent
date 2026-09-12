import { motion } from "framer-motion";
import { Server, Lock, Layers } from "lucide-react";

const items = [
  {
    icon: Server,
    title: "Production Execution Runtime",
    desc: "Built on high-performance FastAPI backends with asynchronous multi-agent task dispatching and n8n webhook orchestration.",
  },
  {
    icon: Lock,
    title: "Secure Isolated Credentials",
    desc: "OAuth tokens and API keys are stored in encrypted vaults with zero cross-tenant credential leakage.",
  },
  {
    icon: Layers,
    title: "Transparent Intermediate Representation",
    desc: "Structured IR schemas ensure deterministic parsing, schema validation, and complete versioned auditability.",
  },
];

const TrustSection = () => (
  <section className="py-20 border-t border-border/60 bg-background/50 relative">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Architecture & <span className="gradient-text">Trust</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
          Engineered for high reliability, auditability, and deterministic output.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="rounded-xl border border-border bg-card/70 p-6 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
              <item.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm mb-2 text-foreground">{item.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustSection;
