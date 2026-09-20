import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { FlowingTransformationVisual } from "./visuals/FlowingTransformationVisual";

export const DescribeSection: React.FC = () => {
  return (
    <section
      id="describe"
      className="relative py-28 px-4 sm:px-6 lg:px-8 bg-background text-foreground transition-colors duration-350 overflow-hidden"
    >
      {/* Background Soft Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-primary/5 rounded-full blur-[160px] pointer-events-none" />

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
            <span>01 — NATURAL INTENT</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            You describe it.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              OmniAgent figures out the rest.
            </span>
          </h2>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Describe what you need in natural language. OmniAgent turns your intent into coordinated, structured execution.
          </p>
        </motion.div>

        {/* Standalone Visualization #1: Flowing Transformation Stream */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <FlowingTransformationVisual />
        </motion.div>
      </div>
    </section>
  );
};
