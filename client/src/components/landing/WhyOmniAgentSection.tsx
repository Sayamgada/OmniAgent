import { motion } from "framer-motion";
import { Clock, Cpu, Gauge, ShieldCheck, Sparkles, TrendingUp, Workflow, Zap } from "lucide-react";

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
          <Gauge className="size-3" />
          <span>Performance & Precision</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">
          Why Teams Choose <span className="gradient-text">OmniAgent</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Engineered to bridge the divide between conversational intent and production-grade automation runtime.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {valueMetrics.map((v, i) => {
          const Icon = v.icon;
          return (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-2xl border border-border/80 bg-card/80 p-5 flex flex-col justify-between hover:border-primary/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded-md border border-primary/25 bg-primary/10">
                    {v.metric}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-foreground mb-2">{v.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 text-[10px] font-mono text-muted-foreground">
                Benchmark Assured
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default WhyOmniAgentSection;
