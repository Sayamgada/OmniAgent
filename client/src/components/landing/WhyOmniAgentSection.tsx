import { motion } from "framer-motion";
import { Zap, Clock, TrendingUp, Workflow } from "lucide-react";

const values = [
  { icon: Zap, title: "No Coding Required", desc: "Build sophisticated AI agents with zero programming knowledge." },
  { icon: Clock, title: "Saves Time & Effort", desc: "What takes weeks manually, OmniAgent does in minutes." },
  { icon: TrendingUp, title: "Scalable Across Industries", desc: "One platform, unlimited industries and use cases." },
  { icon: Workflow, title: "Real-World Workflows", desc: "Designed for practical, production-ready automation." },
];

const WhyOmniAgentSection = () => (
  <section className="py-24 relative">
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/[0.02] to-transparent" />
    <div className="container mx-auto px-4 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          Why <span className="gradient-text">OmniAgent</span>?
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {values.map((v, i) => (
          <motion.div
            key={v.title}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="glass-card-hover rounded-xl p-6 text-center group"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:glow-primary transition-shadow">
              <v.icon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{v.title}</h3>
            <p className="text-sm text-muted-foreground">{v.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyOmniAgentSection;
