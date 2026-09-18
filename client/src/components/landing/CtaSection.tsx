import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/button";

const CtaSection = () => (
  <section className="py-28 bg-white border-t border-slate-200/80 relative overflow-hidden text-slate-900">
    {/* Soft ambient gradient */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-sky-100/50 rounded-full blur-[160px]" />
    </div>

    <div className="container mx-auto px-4 sm:px-6 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative max-w-4xl mx-auto text-center"
      >
        <div className="relative rounded-3xl border border-slate-200/90 bg-white p-8 sm:p-14 shadow-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-mono font-semibold text-sky-700 mb-6 shadow-xs">
            <Sparkles className="size-3.5 text-sky-600" />
            <span>Launch Your AI Fleet Today</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight">
            Ready to Build Your First <span className="bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Autonomous Agent?</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 text-center max-w-xl mx-auto mb-8 leading-relaxed">
            Design, compile, and deploy deterministic multi-agent workflows tailored to education, finance, and corporate operations in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button
              size="lg"
              className="h-12 px-8 bg-primary text-xs sm:text-sm font-bold text-black hover:bg-primary/90 glow-primary rounded-xl transition-all shadow-sm"
              asChild
            >
              <Link to="/sign-up">
                <span>Start Building Free</span>
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-12 px-7 text-xs sm:text-sm font-semibold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all shadow-xs"
              asChild
            >
              <Link to="/sign-in">
                <span>Sign In to Workspace</span>
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CtaSection;
