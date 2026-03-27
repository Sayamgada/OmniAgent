import { motion } from "framer-motion";
import { Network, Sparkles, MessageCircle, Brain, Plug, ShieldCheck } from "lucide-react";

const features = [
  { icon: Network, title: "Multi-Agent Workflows", desc: "Orchestrate multiple agents working together on complex tasks." },
  { icon: Sparkles, title: "Smart Prompt Engineering", desc: "Advanced prompt optimization for accurate, context-aware responses." },
  { icon: MessageCircle, title: "Chat-Based Interaction", desc: "Natural conversational interface for seamless human-AI collaboration." },
  { icon: Brain, title: "Memory & Context Awareness", desc: "Agents remember past interactions and maintain context across sessions." },
  { icon: Plug, title: "API & Tool Integrations", desc: "Connect to external APIs, databases, and tools out of the box." },
  { icon: ShieldCheck, title: "Secure & Scalable", desc: "Enterprise-grade security with auto-scaling infrastructure." },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 relative">
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
    <div className="container mx-auto px-4 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          Key <span className="gradient-text">Features</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg">
          Everything you need to build, deploy, and manage AI agents at scale.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="glass-card-hover rounded-xl p-6 group"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:glow-primary transition-shadow">
              <f.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
