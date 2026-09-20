import React from "react";
import { ArrowRight } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

const MANIFESTO_STEPS = [
  {
    num: "01",
    title: "DESCRIBE",
    tagline: "Tell OmniAgent what you need.",
    detail: "Start with plain words. No programming syntax, no complicated workflow builder interfaces.",
  },
  {
    num: "02",
    title: "UNDERSTAND",
    tagline: "OmniAgent figures out the work.",
    detail: "Intelligence analyzes your goal, breaks down the required tasks, and identifies the right tools.",
  },
  {
    num: "03",
    title: "HANDLE",
    tagline: "The work gets coordinated.",
    detail: "Research, data extraction, analysis, and communication are synchronized autonomously behind the scenes.",
  },
  {
    num: "04",
    title: "DELIVER",
    tagline: "You get the result.",
    detail: "Verified, structured, production-ready deliverables arrive without manual intervention.",
  },
];

export const ExperimentalStaticSection05: React.FC = () => {
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  return (
    <section
      id="experiment-10"
      className="relative min-h-[90vh] py-32 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center"
    >
      {/* Dev Label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>EXPERIMENT 10 — THE OMNIAGENT MANIFESTO</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="max-w-2xl mb-20">
          <div className="text-xs font-mono uppercase tracking-widest text-primary font-bold mb-3">
            Operating Philosophy
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.08]">
            Work should feel{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              simpler.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            The four-step framework behind every autonomous task OmniAgent handles.
          </p>
        </div>

        {/* Vertical Numbered Manifesto Narrative (No Card Grid!) */}
        <div className="space-y-12 sm:space-y-16">
          {MANIFESTO_STEPS.map((step) => (
            <div
              key={step.num}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline pb-10 border-b border-border/60 group hover:border-primary/50 transition-colors"
            >
              {/* Number + Divider */}
              <div className="md:col-span-3 flex items-center gap-4">
                <span className="text-3xl sm:text-4xl font-black font-mono text-muted-foreground/40 group-hover:text-primary transition-colors">
                  {step.num}
                </span>
                <span className="hidden md:block flex-1 h-[1px] bg-border group-hover:bg-primary/50 transition-colors" />
              </div>

              {/* Title & Tagline */}
              <div className="md:col-span-4">
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm font-semibold text-foreground/80 mt-1">
                  {step.tagline}
                </p>
              </div>

              {/* Detail Paragraph */}
              <div className="md:col-span-5">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-12 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>A simple framework for turning complex thoughts into execution.</span>
          <span className="text-primary flex items-center gap-1 font-medium">
            Learn More <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </section>
  );
};
