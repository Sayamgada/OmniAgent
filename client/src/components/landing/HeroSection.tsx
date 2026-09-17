import React, { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import {
  CinematicAiNetworkCanvas,
  DOMAIN_DATA,
  type DomainInfo,
} from "./CinematicAiNetworkCanvas";

const HeroSection = () => {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);

  // Track scroll progress through the pinned transition container
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end end"],
  });

  const [currentScrollProgress, setCurrentScrollProgress] = useState(0);

  // Sync scroll progress with canvas render loop
  React.useEffect(() => {
    return scrollYProgress.on("change", (latest) => {
      setCurrentScrollProgress(latest);
    });
  }, [scrollYProgress]);

  // Scroll-linked transforms for headline: smooth fade and upward drift
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const headlineY = useTransform(scrollYProgress, [0, 0.35], [0, -50]);

  return (
    <div
      ref={heroRef}
      className="relative min-h-[175vh] w-full bg-[#06090F] select-none"
    >
      {/* Pinned Sticky Visual Viewport */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden pt-20 pb-8">
        {/* ------------------------------------------------------------- */}
        {/* 1. ATMOSPHERE & BACKGROUND AMBIENT ILLUMINATION               */}
        {/* ------------------------------------------------------------- */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-primary/10 rounded-full blur-[190px]" />
          <div className="absolute bottom-10 right-1/4 w-[450px] h-[350px] bg-accent/6 rounded-full blur-[170px]" />

          {/* Deep Perspective Background Grid */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 242, 254, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 254, 0.4) 1px, transparent 1px)`,
              backgroundSize: "52px 52px",
              maskImage: "radial-gradient(ellipse at 50% 50%, black 40%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 40%, transparent 80%)",
            }}
          />

          {/* Faint background watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[14vw] font-black tracking-[0.2em] text-white/[0.012] font-mono whitespace-nowrap leading-none">
            OMNIAGENT
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2. MAIN VISUAL: CINEMATIC AI NETWORK CANVAS                   */}
        {/* ------------------------------------------------------------- */}
        <div className="absolute inset-0 z-10">
          <CinematicAiNetworkCanvas
            activeDomain={activeDomain}
            onHoverDomain={setActiveDomain}
            scrollProgress={currentScrollProgress}
          />
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. SIMPLIFIED HERO HEADLINE (NO PARAGRAPH OR BUTTONS)         */}
        {/* ------------------------------------------------------------- */}
        <motion.div
          style={{ opacity: headlineOpacity, y: headlineY }}
          className="container mx-auto px-4 sm:px-6 relative z-20 text-center max-w-4xl pt-4 pointer-events-none"
        >
          {/* Eyebrow Pill */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary mb-4 shadow-sm backdrop-blur-md pointer-events-auto"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="font-mono font-semibold tracking-wide uppercase text-[11px]">
              ONE CORE · INFINITE SPECIALIZED AGENTS
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] max-w-3xl mx-auto text-foreground pointer-events-auto"
          >
            Build AI Agents.
            <br />
            <span className="bg-gradient-to-r from-white via-[#E0F2FE] to-[#38BDF8] bg-clip-text text-transparent">
              Without the Complexity.
            </span>
          </motion.h1>
        </motion.div>

        {/* ------------------------------------------------------------- */}
        {/* 4. SEAMLESS SCROLL HINT (Fades out on scroll)                 */}
        {/* ------------------------------------------------------------- */}
        <motion.div
          style={{ opacity: headlineOpacity }}
          className="container mx-auto px-4 sm:px-6 relative z-20 mt-auto flex items-center justify-center pointer-events-none"
        >
          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground/70">
            <span className="size-1.5 rounded-full bg-primary/70 animate-pulse" />
            <span>Scroll to initialize orchestration core</span>
            <ChevronDown className="size-3.5 text-primary animate-bounce ml-0.5" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection;
