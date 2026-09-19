import React, { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  CinematicAiNetworkCanvas,
  DOMAIN_DATA,
  type DomainInfo,
} from "./CinematicAiNetworkCanvas";
import { useSiteTheme } from "../../context/ThemeContext";

const HeroSection = () => {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { heroTheme, themeProgress } = useSiteTheme();
  const isDarkHero = heroTheme === "dark";

  // Interpolate hero background from #06090F (tp=0) to #F8FAFC (tp=1)
  const heroBgR = Math.round(6 + (248 - 6) * themeProgress);
  const heroBgG = Math.round(9 + (250 - 9) * themeProgress);
  const heroBgB = Math.round(15 + (252 - 15) * themeProgress);
  const heroBgColor = `rgb(${heroBgR}, ${heroBgG}, ${heroBgB})`;

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

  // Scroll-linked transforms: headline stays sharp during initial state, then gently fades out as convergence starts
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const headlineY = useTransform(scrollYProgress, [0, 0.35], [0, -45]);

  return (
    <div
      ref={heroRef}
      style={{ backgroundColor: heroBgColor }}
      className="relative min-h-[260vh] w-full select-none"
    >
      {/* Pinned Sticky Visual Viewport */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden pt-20 pb-8">
        {/* ------------------------------------------------------------- */}
        {/* 1. ATMOSPHERE & BACKGROUND AMBIENT ILLUMINATION               */}
        {/* ------------------------------------------------------------- */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full blur-[190px] transition-colors duration-350 ${
              isDarkHero ? "bg-primary/10" : "bg-sky-500/10"
            }`}
          />
          <div
            className={`absolute bottom-10 right-1/4 w-[450px] h-[350px] rounded-full blur-[170px] transition-colors duration-350 ${
              isDarkHero ? "bg-accent/6" : "bg-teal-500/8"
            }`}
          />

          {/* Deep Perspective Background Grid */}
          <div
            className={`absolute inset-0 transition-opacity duration-350 ${
              isDarkHero ? "opacity-[0.035]" : "opacity-[0.05]"
            }`}
            style={{
              backgroundImage: isDarkHero
                ? `linear-gradient(rgba(0, 242, 254, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 254, 0.4) 1px, transparent 1px)`
                : `linear-gradient(rgba(15, 23, 42, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.25) 1px, transparent 1px)`,
              backgroundSize: "52px 52px",
              maskImage: "radial-gradient(ellipse at 50% 50%, black 40%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 40%, transparent 80%)",
            }}
          />

          {/* Faint background watermark */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[14vw] font-black tracking-[0.2em] font-mono whitespace-nowrap leading-none transition-colors duration-350 ${
              isDarkHero ? "text-white/[0.012]" : "text-slate-900/[0.02]"
            }`}
          >
            OMNIAGENT
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2. MAIN VISUAL: CINEMATIC AI NETWORK & RADIAL LIGHT TRANSITION */}
        {/* ------------------------------------------------------------- */}
        <div className="absolute inset-0 z-10">
          <CinematicAiNetworkCanvas
            activeDomain={activeDomain}
            onHoverDomain={setActiveDomain}
            scrollProgress={currentScrollProgress}
            heroTheme={heroTheme}
            themeProgress={themeProgress}
          />
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. HERO HEADLINE (Fades cleanly before core expansion)       */}
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
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-medium mb-4 shadow-sm backdrop-blur-md pointer-events-auto transition-colors duration-350 ${
              isDarkHero
                ? "border-primary/35 bg-primary/10 text-primary"
                : "border-sky-300 bg-sky-50 text-sky-700"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isDarkHero ? "bg-primary" : "bg-sky-600"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isDarkHero ? "bg-primary" : "bg-sky-600"
                }`}
              />
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
            className={`text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] max-w-3xl mx-auto pointer-events-auto transition-colors duration-350 ${
              isDarkHero ? "text-white" : "text-slate-900"
            }`}
          >
            Build AI Agents.
            <br />
            <span
              className={`bg-clip-text text-transparent transition-colors duration-350 ${
                isDarkHero
                  ? "bg-gradient-to-r from-white via-[#E0F2FE] to-[#38BDF8]"
                  : "bg-gradient-to-r from-slate-950 via-sky-800 to-sky-600"
              }`}
            >
              Without the Complexity.
            </span>
          </motion.h1>
        </motion.div>

        {/* ------------------------------------------------------------- */}
        {/* 4. SCROLL INDICATOR                                          */}
        {/* ------------------------------------------------------------- */}
        <motion.div
          style={{ opacity: headlineOpacity }}
          className="container mx-auto px-4 sm:px-6 relative z-20 mt-auto flex items-center justify-center pointer-events-none"
        >
          <div
            className={`flex items-center gap-2 text-[11px] font-mono transition-colors duration-350 ${
              isDarkHero ? "text-muted-foreground/70" : "text-slate-500"
            }`}
          >
            <span
              className={`size-1.5 rounded-full animate-pulse ${
                isDarkHero ? "bg-primary/70" : "bg-sky-600"
              }`}
            />
            <span>Scroll to ignite orchestration core</span>
            <ChevronDown
              className={`size-3.5 animate-bounce ml-0.5 ${
                isDarkHero ? "text-primary" : "text-sky-600"
              }`}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection;

