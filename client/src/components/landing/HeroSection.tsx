import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Cpu,
  Database,
  Layers,
  Mail,
  MessageSquare,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
  GraduationCap,
  Building2,
  Landmark,
  ChevronRight,
  Terminal,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  CinematicAiNetworkCanvas,
  DOMAIN_DATA,
  type DomainInfo,
} from "./CinematicAiNetworkCanvas";

const HeroSection = () => {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  const selectedDomainData: DomainInfo | null = activeDomain
    ? DOMAIN_DATA[activeDomain] || null
    : null;

  return (
    <section className="relative min-h-[96vh] flex flex-col items-center justify-between overflow-hidden pt-24 pb-12 bg-[#06090F] text-foreground">
      {/* ------------------------------------------------------------- */}
      {/* 1. ATMOSPHERIC BACKGROUND & SUBTLE WATERMARK TYPOGRAPHY      */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        {/* Subtle Radial Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-primary/10 rounded-full blur-[180px]" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[350px] bg-accent/6 rounded-full blur-[160px]" />

        {/* Deep Perspective Background Grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 242, 254, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 254, 0.4) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at 50% 40%, black 40%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 40%, transparent 80%)",
          }}
        />

        {/* Very Large Low-Opacity Typography in deep background */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12vw] font-black tracking-[0.18em] text-white/[0.015] font-mono whitespace-nowrap leading-none">
          OMNIAGENT
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. INTERACTIVE 3D PERSPECTIVE AI NETWORK CANVAS              */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute inset-0 z-10">
        <CinematicAiNetworkCanvas
          activeDomain={activeDomain}
          onHoverDomain={setActiveDomain}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. HERO CONTENT & TYPOGRAPHY FOREGROUND                       */}
      {/* ------------------------------------------------------------- */}
      <div className="container mx-auto px-4 sm:px-6 relative z-20 text-center max-w-5xl my-auto pointer-events-none">
        {/* Orchestration Tag Pill */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary mb-5 shadow-sm backdrop-blur-md pointer-events-auto"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="font-mono font-semibold tracking-wide uppercase text-[11px]">
            One Core · Infinite Specialized Agents
          </span>
        </motion.div>

        {/* Primary Hero Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] max-w-4xl mx-auto mb-6 text-foreground pointer-events-auto"
        >
          Build AI Agents.
          <br />
          <span className="bg-gradient-to-r from-white via-[#E0F2FE] to-[#38BDF8] bg-clip-text text-transparent">
            Without the Complexity.
          </span>
        </motion.h1>

        {/* Supporting Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-base sm:text-lg md:text-xl text-muted-foreground/90 max-w-2xl mx-auto mb-8 leading-relaxed font-normal pointer-events-auto"
        >
          Generate, customize and orchestrate intelligent agents for real-world workflows. Select your domain, define intent in natural language, and compile production-ready multi-agent systems.
        </motion.p>

        {/* Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8 pointer-events-auto"
        >
          <Button
            size="lg"
            className="h-12 px-8 bg-gradient-to-r from-primary to-[#00F2FE] text-sm font-bold text-black hover:opacity-95 shadow-[0_0_24px_rgba(0,242,254,0.35)] hover:shadow-[0_0_32px_rgba(0,242,254,0.55)] rounded-xl transition-all border border-cyan-300/30"
            asChild
          >
            <Link to="/sign-up">
              <span>Create Your Agent</span>
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-12 px-7 text-sm font-medium border-border/80 bg-background/50 hover:bg-card/80 backdrop-blur-md rounded-xl transition-all text-muted-foreground hover:text-foreground hover:border-primary/50"
            asChild
          >
            <a href="#how-it-works">
              <Workflow className="mr-2 size-4 text-primary" />
              <span>Explore Platform</span>
            </a>
          </Button>
        </motion.div>

        {/* ------------------------------------------------------------- */}
        {/* 4. DOMAIN INTERACTIVE CONTROLS / TELEMETRY BADGES             */}
        {/* ------------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-2 pt-2 pointer-events-auto"
        >
          <span className="text-[11px] font-mono text-muted-foreground/70 mr-1 hidden sm:inline-block">
            ORCHESTRATION DOMAINS:
          </span>

          {/* Education Domain Pill */}
          <button
            type="button"
            onMouseEnter={() => setActiveDomain("education")}
            onMouseLeave={() => setActiveDomain(null)}
            onClick={() => setActiveDomain(activeDomain === "education" ? null : "education")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold font-mono transition-all backdrop-blur-md ${
              activeDomain === "education"
                ? "bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.4)]"
                : "bg-background/40 border-border/70 text-muted-foreground hover:text-foreground hover:border-sky-500/40"
            }`}
          >
            <GraduationCap className="size-3.5 text-sky-400" />
            <span>EDUCATION</span>
          </button>

          {/* Finance Domain Pill */}
          <button
            type="button"
            onMouseEnter={() => setActiveDomain("finance")}
            onMouseLeave={() => setActiveDomain(null)}
            onClick={() => setActiveDomain(activeDomain === "finance" ? null : "finance")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold font-mono transition-all backdrop-blur-md ${
              activeDomain === "finance"
                ? "bg-teal-500/20 border-teal-400 text-teal-300 shadow-[0_0_16px_rgba(45,212,191,0.4)]"
                : "bg-background/40 border-border/70 text-muted-foreground hover:text-foreground hover:border-teal-500/40"
            }`}
          >
            <Landmark className="size-3.5 text-teal-400" />
            <span>FINANCE</span>
          </button>

          {/* Corporate Domain Pill */}
          <button
            type="button"
            onMouseEnter={() => setActiveDomain("corporate")}
            onMouseLeave={() => setActiveDomain(null)}
            onClick={() => setActiveDomain(activeDomain === "corporate" ? null : "corporate")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold font-mono transition-all backdrop-blur-md ${
              activeDomain === "corporate"
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_16px_rgba(0,242,254,0.4)]"
                : "bg-background/40 border-border/70 text-muted-foreground hover:text-foreground hover:border-cyan-500/40"
            }`}
          >
            <Building2 className="size-3.5 text-cyan-400" />
            <span>CORPORATE</span>
          </button>
        </motion.div>

        {/* ------------------------------------------------------------- */}
        {/* 5. DYNAMIC DOMAIN CAPABILITY HOVER CARD                       */}
        {/* ------------------------------------------------------------- */}
        <div className="min-h-[72px] mt-4 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {selectedDomainData ? (
              <motion.div
                key={selectedDomainData.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto inline-flex flex-col sm:flex-row items-center gap-3 px-4 py-2.5 rounded-xl border border-primary/40 bg-card/90 backdrop-blur-2xl shadow-2xl text-left"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="size-2 rounded-full animate-pulse"
                    style={{ backgroundColor: selectedDomainData.color }}
                  />
                  <span className="text-xs font-bold font-mono text-foreground">
                    {selectedDomainData.name} SPECIALIZATION:
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedDomainData.agents.map((agent, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-background/80 border border-border text-[11px] font-mono text-muted-foreground"
                    >
                      {agent}
                    </span>
                  ))}
                </div>

                <div className="hidden md:flex items-center gap-1 text-[11px] font-mono text-primary font-semibold pl-2 border-l border-border/70">
                  <Sparkles className="size-3" />
                  <span>{selectedDomainData.metrics}</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-mono text-muted-foreground/60 flex items-center gap-1.5"
              >
                <Terminal className="size-3.5 text-primary/70" />
                <span>Hover over domain nodes or pills to explore orchestrated agent pipelines</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. BOTTOM TELEMETRY STATUS BAR                                */}
      {/* ------------------------------------------------------------- */}
      <div className="container mx-auto px-4 sm:px-6 relative z-20 border-t border-border/50 pt-4 mt-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              100% Deterministic IR
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1 text-primary">
              <Cpu className="size-3.5" />
              Multi-LLM Orchestration
            </span>
            <span className="text-border hidden sm:inline">·</span>
            <span className="hidden sm:inline">Sub-second Compilation</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>FastAPI + n8n Native Runtime</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
