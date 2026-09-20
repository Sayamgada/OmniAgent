import React from "react";
import { ArrowDown, CheckCircle2, XCircle } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

export const ExperimentalStaticSection03: React.FC = () => {
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  return (
    <section
      id="experiment-08"
      className="relative min-h-[90vh] py-32 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center"
    >
      {/* Dev Label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>EXPERIMENT 08 — BEFORE &amp; AFTER</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-tight">
            Less work{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              behind the work.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            See the difference between fragmented manual coordination and autonomous execution.
          </p>
        </div>

        {/* 2-Column Typographic Contrast Canvas (NO Boxed Cards!) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start relative">
          {/* Vertical Center Divider (Desktop) */}
          <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-border/80" />

          {/* LEFT: WITHOUT OMNIAGENT (Fragile Manual Chain) */}
          <div className="space-y-6 md:pr-8 lg:pr-12">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground pb-4 border-b border-border/60">
              <XCircle className="w-4 h-4 text-red-400" />
              <span>WITHOUT OMNIAGENT</span>
            </div>

            <div className="space-y-4 pt-2">
              {[
                "Find the scattered information across tabs",
                "Check documents and raw spreadsheet records",
                "Manually write summary drafts and reports",
                "Send email updates to stakeholders",
                "Follow up on pending responses",
                "Re-check and reconcile everything again",
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col items-start">
                  <div className="text-sm sm:text-base font-medium text-muted-foreground/80 pl-2">
                    {step}
                  </div>
                  {idx < 5 && (
                    <ArrowDown className="w-3.5 h-3.5 text-muted-foreground/40 my-1.5 ml-2" />
                  )}
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-border/40 text-xs font-mono text-muted-foreground/70">
              High cognitive friction · 6+ hours lost weekly on glue tasks
            </div>
          </div>

          {/* RIGHT: WITH OMNIAGENT (High Breathing Room & Bold Confidence) */}
          <div className="space-y-8 md:pl-8 lg:pl-12">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold pb-4 border-b border-primary/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>WITH OMNIAGENT</span>
            </div>

            <div className="space-y-8 pt-2">
              <div className="space-y-2">
                <div className="text-xs font-mono text-primary font-semibold uppercase tracking-wider">
                  STEP 01
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  Describe what you need.
                </h3>
              </div>

              <ArrowDown className="w-5 h-5 text-primary" />

              <div className="space-y-2">
                <div className="text-xs font-mono text-primary font-semibold uppercase tracking-wider">
                  STEP 02
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400 tracking-tight">
                  OmniAgent Coordinates.
                </h3>
              </div>

              <ArrowDown className="w-5 h-5 text-emerald-500" />

              <div className="space-y-2">
                <div className="text-xs font-mono text-emerald-500 font-semibold uppercase tracking-wider">
                  STEP 03
                </div>
                <h3 className="text-3xl sm:text-4xl font-black text-emerald-500 tracking-tight">
                  Done.
                </h3>
              </div>
            </div>

            <div className="pt-6 border-t border-border/40">
              <p className="text-sm font-semibold text-foreground">
                One request replaces a chain of repetitive coordination.
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Instant execution · Zero context switching
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
