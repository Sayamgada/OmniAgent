import { motion } from "framer-motion";
import { Database, FileCode2, Layers, Lock, Server, ShieldCheck, Zap } from "lucide-react";

const trustPillars = [
  {
    icon: Server,
    title: "FastAPI + n8n Asynchronous Core",
    desc: "Built on high-throughput asynchronous FastAPI microservices dispatching multi-agent execution graphs to enterprise n8n workflow engines.",
    tag: "High Concurrency",
  },
  {
    icon: Lock,
    title: "Encrypted Credential Isolation",
    desc: "OAuth tokens and API keys are stored in encrypted per-tenant vaults. Zero cross-tenant leakage and zero credential exposure to LLM contexts.",
    tag: "Per-Tenant Vault",
  },
  {
    icon: FileCode2,
    title: "Deterministic IR Versioning",
    desc: "Intermediate representation schemas are fully versioned, type-checked, and auditable for compliance and regulatory verification.",
    tag: "Schema v2.4",
  },
];

const TrustSection = () => (
  <section className="py-24 border-t border-border/80 bg-background/50 relative">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 text-xs font-mono font-medium text-primary mb-3">
          <ShieldCheck className="size-3" />
          <span>Architecture & Security</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">
          Engineered For <span className="gradient-text">Trust & Auditability</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Production automation demands strict determinism, isolated security, and transparent intermediate schemas.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {trustPillars.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-2xl border border-border/80 bg-card/80 p-6 text-left flex flex-col justify-between hover:border-primary/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-border bg-background/60 text-muted-foreground font-semibold">
                    {item.tag}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-foreground mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-border/60 flex items-center gap-2 text-[11px] font-mono text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Verified Runtime Guarantee</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default TrustSection;
