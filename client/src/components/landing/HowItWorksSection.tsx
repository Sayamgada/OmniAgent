import { motion } from "framer-motion";
import { Building2, PenLine, Cpu, Rocket } from "lucide-react";

const steps = [
  { icon: Building2, title: "Choose Industry", desc: "Select from Education, Finance, Corporate, or custom domains." },
  { icon: PenLine, title: "Describe Your Agent", desc: "Use natural language to define capabilities and behavior." },
  { icon: Cpu, title: "AI Generates Config", desc: "OmniAgent builds a fully configured agent with tools and memory." },
  { icon: Rocket, title: "Test & Deploy", desc: "Instantly test in the sandbox and deploy with one click." },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="py-24 relative">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          How It <span className="gradient-text">Works</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg">
          From idea to deployed AI agent in four simple steps.
        </p>
      </motion.div>

      <div className="relative max-w-4xl mx-auto">
        {/* Connecting line */}
        <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-secondary to-primary/20 hidden md:block" />

        <div className="space-y-12">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="flex items-start gap-6 relative"
            >
              <div className="relative z-10 w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 glow-primary">
                <s.icon className="w-7 h-7 text-primary" />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div className="glass-card-hover rounded-xl p-6 flex-1">
                <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
