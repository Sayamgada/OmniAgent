import React from "react";
import { motion } from "framer-motion";
import { Clock, Gauge, TrendingUp, Workflow, Zap } from "lucide-react";

const valueMetrics = [
  {
    icon: Zap,
    metric: "10x Faster",
    title: "Zero Boilerplate Wiring",
    desc: "Generate complete IR schemas, node wiring, and tool parameter specs in seconds from plain language.",
  },
  {
    icon: Clock,
    metric: "< 2.5s",
    title: "Instant Compilation & Simulation",
    desc: "Test simulated execution chains immediately in the sandbox and refine logic without rebuilding whole pipelines.",
  },
  {
    icon: TrendingUp,
    metric: "100%",
    title: "Domain-Calibrated Precision",
    desc: "Eliminate hallucinations with structured industry guardrails tailored to operations, education, and finance.",
  },
  {
    icon: Workflow,
    metric: "Native",
    title: "Production Runtime Ready",
    desc: "Direct compilation into executable n8n automation engines with enterprise OAuth credential isolation.",
  },
];

const WhyOmniAgentSection = () => (
  <section className="py-28 bg-background text-foreground border-t border-border relative">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1 text-xs font-mono font-semibold text-sky-600 dark:text-sky-400 mb-3 shadow-xs">
          <Gauge className="size-3.5 text-sky-500" />
          <span>Performance & Precision</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
          Why Teams Choose <span className="bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">OmniAgent</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Engineered to bridge the divide between conversational intent and production-grade automation runtime.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
        {valueMetrics.map((v, i) => {
          const Icon = v.icon;
          return (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-sky-500/60 hover:shadow-lg transition-all shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-500">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 px-2.5 py-0.5 rounded-md border border-sky-500/30 bg-sky-500/10">
                    {v.metric}
                  </span>
                </div>
                <h3 className="font-bold text-base text-foreground mb-2">{v.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-border/60 text-[11px] font-mono text-muted-foreground font-medium">
                ✓ Benchmark Assured
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default WhyOmniAgentSection;
