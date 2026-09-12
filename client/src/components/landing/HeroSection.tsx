import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot, Sparkles, Cpu, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-24 pb-16">
      {/* Precision ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-accent/8 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary mb-6">
            <Sparkles className="size-3.5" />
            <span>Autonomous Multi-Agent Automation</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12] max-w-4xl mx-auto mb-6 text-foreground">
            From Plain Language to{" "}
            <span className="gradient-text">Production Workflows</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
            Select your industry domain, state your objective, and generate transparent multi-agent execution graphs with native API tools and live deployment.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Button size="lg" className="h-11 px-6 bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg" asChild>
              <Link to="/sign-up">
                Start Building Free
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-11 px-6 text-sm font-medium border-border hover:bg-card rounded-lg" asChild>
              <a href="#how-it-works">
                Explore Architecture
              </a>
            </Button>
          </div>

          {/* Precision telemetry / blueprint visual showcase */}
          <div className="relative mx-auto max-w-3xl rounded-xl border border-border bg-card/90 p-4 sm:p-5 shadow-2xl backdrop-blur-md text-left">
            <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-muted-foreground">workflow_compiler.v2.ir</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-primary">LLM Extraction</span>
                <span className="rounded bg-secondary/15 px-2 py-0.5 font-mono text-[10px] text-secondary">3 Nodes Compiled</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
                  <Bot className="size-3.5" />
                  <span>Ingestion Agent</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Parses incoming request payload & extracts structured entities</p>
              </div>

              <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
                  <Cpu className="size-3.5" />
                  <span>Reasoning Engine</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Evaluates domain policy constraints & decides next action</p>
              </div>

              <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                  <CheckCircle2 className="size-3.5" />
                  <span>Tool Dispatcher</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Executes live API actions: Gmail, Calendar, n8n webhook</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
