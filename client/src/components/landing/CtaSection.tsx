import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, CornerDownLeft, ArrowUpRight } from "lucide-react";

const EXAMPLE_INTENTS = [
  "I need to organize student diagnostic data and generate personalized quizzes...",
  "Reconcile all Q3 vendor invoices against our ledger and flag variances...",
  "Triage high-priority customer tickets and draft contextual responses...",
];

export const CtaSection: React.FC = () => {
  const [prompt, setPrompt] = useState(EXAMPLE_INTENTS[0]);
  const navigate = useNavigate();

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/sign-up");
  };

  return (
    <section
      id="experience"
      className="relative min-h-[85vh] py-32 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] bg-primary/5 rounded-full blur-[180px] pointer-events-none" />

      {/* Subtle Full-Canvas Grid Texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="max-w-4xl mx-auto w-full relative z-10 text-center flex flex-col items-center">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-xs font-mono uppercase tracking-widest text-primary font-bold mb-4 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>READY?</span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.04]"
        >
          Give OmniAgent{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
            the work.
          </span>
        </motion.h2>

        {/* Secondary Description */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="mt-4 text-base sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed"
        >
          Describe what needs to happen. Let the intelligence handle the coordination.
        </motion.p>

        {/* Large Interactive Intent-Entry Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full mt-10"
        >
          <form
            onSubmit={handleExecute}
            className="relative w-full rounded-3xl border border-border/90 bg-card/85 backdrop-blur-2xl shadow-2xl p-4 sm:p-6 transition-all duration-300 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 text-left"
          >
            {/* Top Bar Label */}
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Task Intent
              </span>
              <span className="text-[11px] text-muted-foreground/60">Plain Language</span>
            </div>

            {/* Input Area */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe what you need OmniAgent to do..."
              className="w-full bg-transparent border-0 resize-none text-foreground font-medium text-base sm:text-lg focus:outline-none placeholder:text-muted-foreground/50 leading-relaxed"
            />

            {/* Bottom Action Row */}
            <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-2">
              <span className="text-xs text-muted-foreground font-mono hidden sm:inline-block">
                Press Start to activate coordination
              </span>
              <button
                type="submit"
                className="ml-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Start</span>
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick Example Intent Chips */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-mono text-muted-foreground mr-1 uppercase text-[11px] tracking-wider">
              Try an example:
            </span>
            {EXAMPLE_INTENTS.map((intent, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(intent)}
                className="px-3.5 py-1.5 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-all text-left text-xs font-medium cursor-pointer max-w-xs truncate"
              >
                {intent.slice(0, 36)}...
              </button>
            ))}
          </div>
        </motion.div>

        {/* Integrated Clean Navigation CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm"
        >
          <Link
            to="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 hover:bg-primary/90 transition-all"
          >
            <span>Start Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/sign-in"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-semibold transition-colors py-2 px-4"
          >
            <span>Sign In to Workspace</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default CtaSection;
