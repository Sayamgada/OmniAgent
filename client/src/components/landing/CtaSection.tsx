import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, Sparkles, Zap } from "lucide-react";
import { Button } from "../../components/ui/button";

const CtaSection = () => (
  <section className="py-24 border-t border-border/80 bg-background relative overflow-hidden">
    {/* Ambient Glow */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[160px]" />
    </div>

    <div className="container mx-auto px-4 sm:px-6 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative max-w-4xl mx-auto text-center"
      >
        <div className="relative rounded-3xl border border-border/90 bg-card/90 p-8 sm:p-14 shadow-2xl backdrop-blur-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-medium text-primary mb-6">
            <Sparkles className="size-3.5" />
            <span>Launch Your AI Fleet Today</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
            Ready to Build Your First <span className="gradient-text">Autonomous Agent?</span>
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground text-center max-w-xl mx-auto mb-8 leading-relaxed">
            Design, compile, and deploy deterministic multi-agent workflows tailored to your industry domain in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="h-11 px-8 bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg transition-all" asChild>
              <Link to="/sign-up">
                <span>Start Building Free</span>
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-11 px-6 text-sm font-medium border-border/80 hover:bg-card rounded-lg transition-all" asChild>
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
