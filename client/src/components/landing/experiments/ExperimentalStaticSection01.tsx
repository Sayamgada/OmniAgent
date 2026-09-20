import React from "react";
import { ArrowUpRight } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

export const ExperimentalStaticSection01: React.FC = () => {
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  return (
    <section
      id="experiment-06"
      className="relative min-h-[90vh] py-32 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center"
    >
      {/* Dev Label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>EXPERIMENT 06 — THE SIMPLE PROMISE</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: Asymmetric Bold Typography */}
          <div className="lg:col-span-7 space-y-8">
            <div className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
              The OmniAgent Promise
            </div>

            <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-foreground leading-[0.98]">
              YOU HAVE
              <br />
              THE WORK.
              <span className="block my-4 sm:my-6 h-[1px] w-24 bg-primary/60" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
                OmniAgent
                <br />
                handles the
                <br />
                complexity.
              </span>
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed pt-2">
              Describe what you need in plain language. OmniAgent coordinates the steps, tools, and execution behind the scenes.
            </p>
          </div>

          {/* Right: Three Minimalist Typographic Markers (No Cards!) */}
          <div className="lg:col-span-5 flex flex-col justify-center divide-y divide-border/60">
            {[
              {
                num: "01",
                label: "PLAN",
                desc: "Your plain-English request is translated into clear, actionable intent.",
              },
              {
                num: "02",
                label: "COORDINATE",
                desc: "Research, analysis, and data retrieval are synchronized autonomously.",
              },
              {
                num: "03",
                label: "EXECUTE",
                desc: "Verified, production-ready deliverables and updates arrive instantly.",
              },
            ].map((marker) => (
              <div
                key={marker.num}
                className="py-8 group transition-colors duration-300 hover:pl-2"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-baseline gap-4">
                    <span className="text-xs font-mono text-muted-foreground font-semibold">
                      {marker.num}
                    </span>
                    <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {marker.label}
                    </h3>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground pl-8 leading-relaxed">
                  {marker.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
