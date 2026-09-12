import { motion } from "framer-motion";
import { Briefcase, PenLine, Cpu, Rocket } from "lucide-react";

const steps = [
  {
    stepNumber: 1,
    icon: Briefcase,
    title: "Select Industry Domain",
    desc: "Choose from Corporate Operations, Education, or Finance to anchor domain intelligence and schema rules.",
  },
  {
    stepNumber: 2,
    icon: PenLine,
    title: "Describe Your Automation",
    desc: "State your target outcome in natural language or use pre-configured domain prompt blueprints.",
  },
  {
    stepNumber: 3,
    icon: Cpu,
    title: "AI Compiles IR Workflow",
    desc: "OmniAgent extracts tools, multi-agent roles, conditional reasoning steps, and required integrations.",
  },
  {
    stepNumber: 4,
    icon: Rocket,
    title: "Inspect, Test & Deploy",
    desc: "Review the live node graph, verify JSON parameters, test integrations, and deploy to production.",
  },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="py-20 relative">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">
          How OmniAgent <span className="gradient-text">Works</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
          From natural language prompt to deployed multi-agent execution pipeline.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="relative rounded-xl border border-border bg-card/80 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <s.icon className="size-5" />
                </div>
                <span className="font-mono text-xs font-semibold text-muted-foreground/80 px-2 py-0.5 rounded bg-muted/50 border border-border">
                  Step {s.stepNumber}
                </span>
              </div>
              <h3 className="font-semibold text-sm mb-1.5 text-foreground">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
