import { motion } from "framer-motion";
import { MessageSquare, Globe, Code2, FlaskConical } from "lucide-react";

const features = [
  { icon: MessageSquare, title: "Prompt-Based Agent Creation", desc: "Describe what you need in plain English — OmniAgent builds the agent for you." },
  { icon: Globe, title: "Multi-Industry Support", desc: "Pre-configured for Education, Finance, Corporate, and more." },
  { icon: Code2, title: "No-Code AI System", desc: "No programming skills needed. Just describe and deploy." },
  { icon: FlaskConical, title: "Real-Time Agent Testing", desc: "Test your agents instantly before going live." },
];

const WhatIsSection = () => (
  <section className="py-24 relative">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          What is <span className="gradient-text">OmniAgent</span>?
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          A web-based platform that generates AI agents dynamically. Select an industry, describe your needs, and let OmniAgent build a customized AI assistant.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
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

export default WhatIsSection;
