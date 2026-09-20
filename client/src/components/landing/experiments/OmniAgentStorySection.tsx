import React from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

export const OmniAgentStorySection: React.FC = () => {
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  return (
    <section
      id="story"
      className="relative min-h-screen py-36 px-4 sm:px-6 lg:px-16 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Dev Marker */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>05 · THE OMNIAGENT STORY</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10">
        {/* Magazine Editorial Masthead Label */}
        <div className="flex items-center justify-between pb-8 mb-16 border-b border-border/80 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <span>OmniAgent Magazine · Issue 01</span>
          <span>A Manifesto on Execution</span>
        </div>

        {/* 3-Stage Asymmetric Editorial Narrative */}
        <div className="space-y-24 sm:space-y-32">
          {/* ACT 01: THE PROBLEM */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">
              01 / THE PROBLEM
            </div>
            <div className="lg:col-span-9 space-y-4">
              <h2 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-foreground leading-[0.92]">
                YOU HAVE
                <br />
                THE WORK.
              </h2>
              <p className="text-base sm:text-xl text-muted-foreground max-w-xl font-medium leading-relaxed pt-2">
                Scattered across five browser tabs, buried in unread messages, and slowed down by manual coordination.
              </p>
            </div>
          </div>

          {/* ACT 02: THE SHIFT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-3 text-xs font-mono uppercase tracking-widest text-primary font-bold">
              02 / THE SHIFT
            </div>
            <div className="lg:col-span-9 space-y-4">
              <h2 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400 leading-[0.92]">
                OMNIAGENT
                <br />
                HANDLES
                <br />
                THE COMPLEXITY.
              </h2>
              <p className="text-base sm:text-xl text-muted-foreground max-w-xl font-medium leading-relaxed pt-2">
                One clear prompt activates autonomous coordination. Research, synthesis, logistics, and verified output occur in seconds.
              </p>
            </div>
          </div>

          {/* ACT 03: THE RESULT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-3 text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              03 / THE RESULT
            </div>
            <div className="lg:col-span-9 space-y-4">
              <h2 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-emerald-500 leading-[0.92]">
                YOU GET
                <br />
                TIME BACK.
              </h2>
              <p className="text-base sm:text-xl text-muted-foreground max-w-xl font-medium leading-relaxed pt-2">
                Hours reclaimed every single week. More time for strategy, creativity, and the things that actually matter.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Editorial Colophon */}
        <div className="mt-28 pt-8 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <span>Precision Autonomous Engineering · Built for Focus</span>
          <span className="text-primary flex items-center gap-1 font-sans">
            Start Building with OmniAgent <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </section>
  );
};
