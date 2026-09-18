import React from "react";
import { motion } from "framer-motion";
import { FileCode2, Lock, Server, ShieldCheck } from "lucide-react";

const trustPillars = [
  {
    icon: Server,
    title: "FastAPI + n8n Asynchronous Core",
    desc: "Built on high-throughput asynchronous FastAPI microservices dispatching multi-agent execution graphs to enterprise n8n workflow engines.",
    tag: "High Concurrency",
    badgeStyle: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    icon: Lock,
    title: "Encrypted Credential Isolation",
    desc: "OAuth tokens and API keys are stored in encrypted per-tenant vaults. Zero cross-tenant leakage and zero credential exposure to LLM contexts.",
    tag: "Per-Tenant Vault",
    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    icon: FileCode2,
    title: "Deterministic IR Versioning",
    desc: "Intermediate representation schemas are fully versioned, type-checked, and auditable for compliance and regulatory verification.",
    tag: "Schema v2.4",
    badgeStyle: "bg-teal-50 text-teal-700 border-teal-200",
  },
];

const TrustSection = () => (
  <section className="py-28 bg-slate-50 text-slate-900 border-t border-slate-200/80 relative">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-mono font-semibold text-sky-700 mb-3 shadow-xs">
          <ShieldCheck className="size-3.5 text-sky-600" />
          <span>Architecture & Security</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight">
          Engineered For <span className="bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">Trust & Auditability</span>
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
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
              className="rounded-2xl border border-slate-200/90 bg-white p-6 text-left flex flex-col justify-between hover:border-sky-400/80 hover:shadow-lg transition-all shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-sky-50 border border-sky-200/80 text-sky-600">
                    <Icon className="size-5" />
                  </div>
                  <span className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.badgeStyle}`}>
                    {item.tag}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-2">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center gap-2 text-[11px] font-mono text-emerald-600 font-semibold">
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
