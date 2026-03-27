import { motion } from "framer-motion";
import { Server, Lock, Layers } from "lucide-react";

const items = [
  { icon: Server, title: "Modern Tech Stack", desc: "Built with Next.js, FastAPI, and cutting-edge AI frameworks." },
  { icon: Lock, title: "Enterprise Security", desc: "End-to-end encryption, RBAC, and audit logging built in." },
  { icon: Layers, title: "Multi-Agent Orchestration", desc: "Coordinate multiple agents with shared memory and context." },
];

const TrustSection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          Built to <span className="gradient-text">Scale</span>
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="glass-card-hover rounded-xl p-6 text-center"
          >
            <item.icon className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustSection;
