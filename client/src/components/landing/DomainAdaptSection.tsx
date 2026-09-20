import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { MorphingDomainVisual } from "./visuals/MorphingDomainVisual";

export const DomainAdaptSection: React.FC = () => {
  return (
    <section
      id="domains"
      className="relative py-28 px-4 sm:px-6 lg:px-8 bg-background border-t border-border/40 text-foreground transition-colors duration-350 overflow-hidden"
    >
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-primary/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>03 — MULTI-DOMAIN ADAPTATION</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            One intelligence.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              Many possibilities.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Built for the way you work. Whether in education, finance, or business operations, OmniAgent adapts effortlessly.
          </p>
        </motion.div>

        {/* Standalone Visualization #2: Morphing Domain Canvas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <MorphingDomainVisual />
        </motion.div>
      </div>
    </section>
  );
};
