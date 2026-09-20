import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Terminal } from "lucide-react";
import { Button } from "../../components/ui/button";

export const CtaSection: React.FC = () => (
  <section className="relative py-32 px-4 sm:px-6 lg:px-8 bg-background border-t border-border/40 overflow-hidden text-foreground">
    {/* Subtle core halo echo in background */}
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div className="w-[600px] h-[600px] rounded-full bg-primary/10 blur-[140px]" />
      <div className="absolute w-[400px] h-[400px] rounded-full border border-primary/20 opacity-30" />
      <div className="absolute w-[260px] h-[260px] rounded-full border border-primary/25" />
    </div>

    <div className="max-w-4xl mx-auto relative z-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl p-8 sm:p-14 lg:p-16 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle top light flare */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono uppercase tracking-widest mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>GET STARTED IN SECONDS</span>
        </div>

        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-5 leading-tight">
          What will you{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
            build?
          </span>
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          Join thousands creating intelligent autonomous agents for education, finance, and business operations.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="h-12 px-8 bg-primary font-bold text-primary-foreground hover:bg-primary/90 rounded-xl transition-all shadow-lg hover:shadow-primary/20 flex items-center gap-2 text-sm"
            asChild
          >
            <Link to="/sign-up">
              <span>Start Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-12 px-7 text-sm font-semibold border-border bg-background hover:bg-muted/40 rounded-xl transition-all"
            asChild
          >
            <Link to="/sign-in" className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <span>Sign In to Workspace</span>
            </Link>
          </Button>
        </div>

        <div className="mt-10 pt-6 border-t border-border/40 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Free 14-day trial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Setup in 2 minutes
          </span>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CtaSection;
