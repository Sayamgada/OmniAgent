import { motion } from "framer-motion";
import { Zap, Clock, TrendingUp, Workflow } from "lucide-react";

const values = [
  {
    icon: Zap,
    title: "Zero Manual Boilerplate",
    desc: "Generate complete IR schemas, node wiring, and tool parameter specs in seconds from plain language.",
  },
  {
    icon: Clock,
    title: "Rapid Iteration Loop",
    desc: "Test simulated executions immediately in the sandbox and refine logic without rebuilding whole pipelines.",
  },
  {
    icon: TrendingUp,
    title: "Domain-Calibrated Precision",
    desc: "Avoid generic hallucinations with structured industry guardrails tailored to operations, education, and finance.",
  },
  {
    icon: Workflow,
    title: "Production Runtime Ready",
    desc: "Direct compilation into executable automation engines with enterprise OAuth credential isolation.",
  },
];

const WhyOmniAgentSection = () => (
  <section className="py-20 border-t border-border/60 bg-background/50 relative">
    <div className="container mx-auto px-4 sm:px-6 relative">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Why Choose <span className="gradient-text">OmniAgent</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
          Engineered to eliminate the gap between concept design and reliable automation runtime.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {values.map((v, i) => (
          <motion.div
            key={v.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="rounded-xl border border-border bg-card/70 p-5"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
              <v.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm mb-1.5 text-foreground">{v.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyOmniAgentSection;
