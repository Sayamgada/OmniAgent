import React from "react";
import { motion } from "framer-motion";
import { FileCode2, Lock, Server, ShieldCheck } from "lucide-react";

const trustPillars = [
  {
    icon: Server,
    title: "FastAPI + n8n Asynchronous Core",
    desc: "Built on high-throughput asynchronous FastAPI microservices dispatching multi-agent execution graphs to enterprise n8n workflow engines.",
    tag: "High Concurrency",
    badgeStyle: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  {
    icon: Lock,
    title: "Encrypted Credential Isolation",
    desc: "OAuth tokens and API keys are stored in encrypted per-tenant vaults. Zero cross-tenant leakage and zero credential exposure to LLM contexts.",
    tag: "Per-Tenant Vault",
    badgeStyle: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    icon: FileCode2,
    title: "Deterministic IR Versioning",
    desc: "Intermediate representation schemas are fully versioned, type-checked, and auditable for compliance and regulatory verification.",
    tag: "Schema v2.4",
    badgeStyle: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
];

const TrustSection = () => (
  <section className="py-28 bg-muted/30 text-foreground border-t border-border relative">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1 text-xs font-mono font-semibold text-sky-600 dark:text-sky-400 mb-3 shadow-xs">
          <ShieldCheck className="size-3.5 text-sky-500" />
          <span>Architecture & Security</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
          Engineered For <span className="bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">Trust & Auditability</span>
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
              className="rounded-2xl border border-border bg-card p-6 text-left flex flex-col justify-between hover:border-sky-500/60 hover:shadow-lg transition-all shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-500">
                    <Icon className="size-5" />
                  </div>
                  <span className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.badgeStyle}`}>
                    {item.tag}
                  </span>
                </div>
                <h3 className="font-bold text-base text-foreground mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center gap-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
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
