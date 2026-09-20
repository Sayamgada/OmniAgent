import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, Sliders, ArrowRight } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

const NOISE_WORDS = [
  "research", "unread emails", "follow-ups", "spreadsheets", "customer tickets",
  "quarterly reports", "meeting logistics", "data analysis", "40-page documents",
  "client questions", "imminent deadlines", "invoice audits", "system alerts",
  "status syncs", "drafting proposals", "calendar conflicts", "liability checks"
];

export const SignalSection: React.FC = () => {
  const [clarityLevel, setClarityLevel] = useState(0.8); // 0 (Pure Noise) -> 1 (Pure Signal)
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  return (
    <section
      id="signal"
      className="relative min-h-screen py-32 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Dev Marker */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>02 · THE SIGNAL</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10 flex flex-col items-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-10"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.08]">
            Too much to think about.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              One place to start.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Watch the chaotic cloud of daily noise compress into a single actionable signal.
          </p>
        </motion.div>

        {/* Interactive Clarity Slider Control */}
        <div className="w-full max-w-md mx-auto mb-10 flex items-center gap-4 px-6 py-3 rounded-full bg-card/80 border border-border/80 shadow-md backdrop-blur-md">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            Noise
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={clarityLevel}
            onChange={(e) => setClarityLevel(parseFloat(e.target.value))}
            className="flex-1 accent-primary h-1.5 rounded-lg cursor-pointer bg-muted"
          />
          <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold">
            Clarity ({Math.round(clarityLevel * 100)}%)
          </span>
        </div>

        {/* Typographic Noise to Signal Field Stage */}
        <div className="relative w-full h-[460px] sm:h-[520px] rounded-3xl border border-border/80 bg-card/60 backdrop-blur-2xl shadow-2xl overflow-hidden flex items-center justify-center p-6 sm:p-12">
          {/* Ambient Background Noise Word Field */}
          <div className="absolute inset-0 p-8 flex flex-wrap gap-4 items-center justify-center pointer-events-none overflow-hidden select-none">
            {NOISE_WORDS.map((word, idx) => {
              const noiseOpacity = Math.max(0.04, (1 - clarityLevel) * 0.7);
              const blurAmt = clarityLevel * 8;
              const scale = 0.8 + (1 - clarityLevel) * 0.4;
              return (
                <span
                  key={idx}
                  style={{
                    opacity: noiseOpacity,
                    filter: `blur(${blurAmt}px)`,
                    transform: `scale(${scale})`,
                    transition: "all 0.4s ease-out",
                  }}
                  className="font-mono text-xs sm:text-sm font-semibold uppercase text-muted-foreground tracking-wider"
                >
                  {word}
                </span>
              );
            })}
          </div>

          {/* Central High-Signal Typographic Resolution */}
          <motion.div
            style={{
              opacity: Math.max(0.3, clarityLevel),
              scale: 0.9 + clarityLevel * 0.15,
            }}
            className="relative z-10 text-center max-w-xl p-6"
          >
            <div className="text-xs font-mono uppercase tracking-widest text-primary font-bold mb-3 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Direct Actionable Signal</span>
            </div>

            <h3 className="text-3xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-tight mb-4">
              &quot;WHAT NEEDS TO
              <br />
              GET DONE?&quot;
            </h3>

            <div className="h-[2px] w-20 bg-primary mx-auto my-6" />

            <div className="space-y-2">
              <div className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
                OMNIAGENT COORDINATES
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                One clear prompt replaces twenty fragmented mental distractions.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Footnote */}
        <div className="mt-8 flex items-center justify-between w-full text-xs text-muted-foreground font-mono">
          <span>Typographic compression resolves scattered chaos into instant clarity.</span>
          <span className="text-primary flex items-center gap-1 font-sans">
            High-Signal Interface <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </section>
  );
};
