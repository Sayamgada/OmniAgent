import React, { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

interface RequestRow {
  num: string;
  query: string;
  category: string;
  detail: string;
  tagColor: string;
}

const CATALOGUE_REQUESTS: RequestRow[] = [
  {
    num: "01",
    query: "Prepare a study plan for my students.",
    category: "EDUCATION",
    detail: "Generates a 12-week curriculum, custom diagnostic practice quizzes, and synchronizes with your school LMS.",
    tagColor: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  },
  {
    num: "02",
    query: "Review this month's financial activity.",
    category: "FINANCE",
    detail: "Reconciles raw transactions against accounting ledgers, flags variance over 2%, and compiles an audit memo.",
    tagColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    num: "03",
    query: "Follow up with these VIP customers.",
    category: "BUSINESS",
    detail: "Triages high-priority inquiries, prepares context-aware response drafts, and updates your team CRM.",
    tagColor: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    num: "04",
    query: "Turn these 40-page documents into a concise brief.",
    category: "OPERATIONS",
    detail: "Extracts key clauses, tabular figures, and action items into a clean 1-page executive briefing summary.",
    tagColor: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    num: "05",
    query: "Research this industry topic and compile a report.",
    category: "RESEARCH",
    detail: "Gathers verified citations, analyzes competitor pricing models, and synthesizes structured comparison charts.",
    tagColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
];

export const ExperimentalStaticSection02: React.FC = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  return (
    <section
      id="experiment-07"
      className="relative min-h-[90vh] py-32 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center"
    >
      {/* Dev Label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>EXPERIMENT 07 — REQUEST CATALOGUE</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-tight">
            Start with the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              work.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            What can you actually ask OmniAgent to do? Here is a curated index of real-world requests.
          </p>
        </div>

        {/* Editorial Catalogue Index (No Dashboard Cards!) */}
        <div className="divide-y divide-border/70 border-t border-b border-border/70">
          {CATALOGUE_REQUESTS.map((req, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={req.num}
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="py-6 sm:py-7 group cursor-pointer transition-colors duration-200 hover:bg-muted/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      {req.num}
                    </span>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">
                      &quot;{req.query}&quot;
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 pl-8 sm:pl-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${req.tagColor}`}
                    >
                      {req.category}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
                        isExpanded ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Expanding Understated Detail Line */}
                {isExpanded && (
                  <div className="mt-4 pl-8 sm:pl-12 pr-4 pt-2 border-l-2 border-primary/40 text-xs sm:text-sm text-muted-foreground leading-relaxed animate-in fade-in duration-200">
                    {req.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Click any request to view coordinated outcomes.</span>
          <span className="text-primary flex items-center gap-1 font-medium">
            Explore All Capabilities <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </section>
  );
};
