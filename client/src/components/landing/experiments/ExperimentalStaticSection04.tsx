import React, { useState } from "react";
import { BookOpen, LineChart, Cpu, FileCheck2, ArrowUpRight } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

const OUTCOME_AREAS = [
  {
    num: "01",
    title: "LEARN",
    icon: BookOpen,
    tagline: "Personalized learning plans, quizzes and student support.",
    examples: ["12-Week Adaptive Curriculum", "Diagnostic Practice Quizzes", "LMS Student Progress Sync"],
  },
  {
    num: "02",
    title: "ANALYZE",
    icon: LineChart,
    tagline: "Research, summaries and structured data insights.",
    examples: ["Fiscal Ledger Reconciliation", "40-Page PDF Briefing Extraction", "Competitor Benchmark Charts"],
  },
  {
    num: "03",
    title: "OPERATE",
    icon: Cpu,
    tagline: "Customer requests, follow-ups and recurring workflows.",
    examples: ["VIP Support Ticket Triage", "Context-Rich Email Drafts", "Cross-App CRM Synchronization"],
  },
  {
    num: "04",
    title: "REPORT",
    icon: FileCheck2,
    tagline: "Documents, updates and finished leadership deliverables.",
    examples: ["Executive Audit Summaries", "Client Proposal Decks", "Automated Compliance Trails"],
  },
];

export const ExperimentalStaticSection04: React.FC = () => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  return (
    <section
      id="experiment-09"
      className="relative min-h-[90vh] py-32 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center"
    >
      {/* Dev Label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>EXPERIMENT 09 — OUTCOME SHOWCASE</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.12]">
            You don&apos;t need to manage the process.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              You need the outcome.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            OmniAgent is valuable because it produces real, useful deliverables.
          </p>
        </div>

        {/* 4 Spacious Editorial Outcome Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {OUTCOME_AREAS.map((area, idx) => {
            const Icon = area.icon;
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={area.num}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="p-8 sm:p-10 rounded-3xl border border-border/70 bg-card/40 hover:bg-card hover:border-primary/50 transition-all duration-300 flex flex-col justify-between group shadow-xs hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl sm:text-5xl font-black font-mono text-muted-foreground/30 group-hover:text-primary transition-colors">
                      {area.num}
                    </span>
                    <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2 group-hover:text-primary transition-colors">
                    {area.title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {area.tagline}
                  </p>
                </div>

                {/* Concrete Examples */}
                <div className="mt-8 pt-6 border-t border-border/40">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase font-bold mb-2">
                    Sample Deliverables
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {area.examples.map((ex, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-background/80 border border-border/60 text-[11px] text-foreground font-medium"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
