import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, ArrowDown } from "lucide-react";

const NOISE_WORDS = [
  "research", "unread emails", "follow-ups", "spreadsheets", "customer tickets",
  "quarterly reports", "meeting logistics", "data analysis", "40-page documents",
  "client questions", "imminent deadlines", "invoice audits", "system alerts",
  "status syncs", "drafting proposals", "calendar conflicts", "liability checks",
  "budget approvals", "task switching", "manual spreadsheets", "context loss",
  "cross-checking notes", "vendor follow-ups", "formatting slides", "slack pings"
];

export const BeforeVsAfterSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Track scroll progress through this section (0 = entering, 1 = leaving)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Dynamic Scroll Transitions
  const noiseOpacity = useTransform(scrollYProgress, [0.05, 0.45, 0.75], [0.65, 0.25, 0.04]);
  const noiseScale = useTransform(scrollYProgress, [0.05, 0.75], [1.05, 0.85]);

  const clarityOpacity = useTransform(scrollYProgress, [0.25, 0.65], [0, 1]);
  const clarityScale = useTransform(scrollYProgress, [0.25, 0.7], [0.88, 1]);
  const clarityY = useTransform(scrollYProgress, [0.25, 0.7], [35, 0]);

  const introLabelOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  return (
    <div
      ref={containerRef}
      id="before-vs-after"
      className="relative min-h-[200vh] bg-background border-t border-border/60 text-foreground transition-colors duration-350"
    >
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-12">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] bg-primary/5 rounded-full blur-[180px] pointer-events-none" />

        {/* Scroll Prompt Indicator at start */}
        <motion.div
          style={{ opacity: introLabelOpacity }}
          className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-border/70 bg-card/60 text-muted-foreground text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs mb-2">
            <span>Scroll To Transform</span>
          </div>
          <ArrowDown className="w-3.5 h-3.5 text-muted-foreground/60 animate-bounce" />
        </motion.div>

        {/* Dynamic Typographic Noise Field (Scattered Work) */}
        <motion.div
          style={{
            opacity: noiseOpacity,
            scale: noiseScale,
          }}
          className="absolute inset-0 p-8 sm:p-14 flex flex-wrap gap-4 sm:gap-6 items-center justify-center pointer-events-none select-none max-w-7xl mx-auto overflow-hidden"
        >
          {NOISE_WORDS.map((word, idx) => (
            <span
              key={idx}
              className="font-mono text-xs sm:text-base lg:text-lg font-semibold uppercase text-muted-foreground tracking-wider"
            >
              {word}
            </span>
          ))}
        </motion.div>

        {/* Central High-Clarity OmniAgent Resolution (Emerges smoothly as user scrolls) */}
        <motion.div
          style={{
            opacity: clarityOpacity,
            scale: clarityScale,
            y: clarityY,
          }}
          className="relative z-10 text-center max-w-3xl px-4 flex flex-col items-center pointer-events-none"
        >
          <div className="text-xs font-mono uppercase tracking-widest text-primary font-bold mb-4 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Direct Actionable Clarity</span>
          </div>

          <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-foreground tracking-tight leading-[0.96] mb-6">
            WHAT NEEDS TO
            <br />
            GET DONE?
          </h2>

          <div className="h-[2px] w-24 bg-primary/70 my-4" />

          <div className="space-y-3 mt-2">
            <div className="text-2xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              OMNIAGENT COORDINATES.
            </div>
            <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-lg mx-auto leading-relaxed">
              One clear request replaces a day of fragmented work.
            </p>
          </div>
        </motion.div>

        {/* Subtle Bottom Status Note */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-mono uppercase tracking-widest pointer-events-none">
          <span>Life Before OmniAgent → Life With OmniAgent</span>
        </div>
      </div>
    </div>
  );
};
