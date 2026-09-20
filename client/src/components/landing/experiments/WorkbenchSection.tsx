import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, FileText, Database, CheckSquare, Layers, RotateCcw, ArrowRight } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

interface WorkbenchItem {
  id: string;
  type: "request" | "document" | "data" | "task" | "result";
  title: string;
  detail: string;
  icon: React.ElementType;
  scatteredPos: { x: number; y: number; rotate: number };
  organizedPos: { x: number; y: number; rotate: number };
  accent: string;
}

const WORKBENCH_ITEMS: WorkbenchItem[] = [
  {
    id: "req",
    type: "request",
    title: "Client Intent",
    detail: "Draft 12-week study track & quiz rubric",
    icon: Sparkles,
    scatteredPos: { x: -32, y: -26, rotate: -8 },
    organizedPos: { x: -30, y: -22, rotate: 0 },
    accent: "#38BDF8",
  },
  {
    id: "doc",
    type: "document",
    title: "Raw Syllabus PDF",
    detail: "48 pages of lecture curriculum notes",
    icon: FileText,
    scatteredPos: { x: 30, y: -28, rotate: 6 },
    organizedPos: { x: 30, y: -22, rotate: 0 },
    accent: "#818CF8",
  },
  {
    id: "data",
    type: "data",
    title: "Student Diagnostic",
    detail: "Quiz results & mastery assessment data",
    icon: Database,
    scatteredPos: { x: -34, y: 24, rotate: 7 },
    organizedPos: { x: -30, y: 22, rotate: 0 },
    accent: "#F59E0B",
  },
  {
    id: "task",
    type: "task",
    title: "Action Item",
    detail: "Generate 3 adaptive diagnostic quizzes",
    icon: CheckSquare,
    scatteredPos: { x: 32, y: 26, rotate: -6 },
    organizedPos: { x: 30, y: 22, rotate: 0 },
    accent: "#10B981",
  },
];

export const WorkbenchSection: React.FC = () => {
  const [isOrganized, setIsOrganized] = useState(false);
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  return (
    <section
      id="workbench"
      className="relative min-h-screen py-32 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Dev Marker */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>01 · THE WORKBENCH</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-tight">
            Give the work{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              a place to go.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Bring together the things that need to get done. OmniAgent coordinates what happens next.
          </p>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setIsOrganized(!isOrganized)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all cursor-pointer"
            >
              {isOrganized ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Scatter Workbench</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Organize Workbench</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Spatial Workbench Stage Viewed From Above (NO Card Grids!) */}
        <div className="relative h-[480px] sm:h-[540px] rounded-3xl border border-border/80 bg-card/60 backdrop-blur-2xl shadow-2xl overflow-hidden flex items-center justify-center p-6">
          {/* Workbench Tactile Surface Grid */}
          <div
            className="absolute inset-0 opacity-[0.035] pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />

          {/* Central OmniAgent Workspace Hub */}
          <motion.div
            animate={{
              scale: isOrganized ? 1.08 : 1,
              boxShadow: isOrganized
                ? "0 0 50px rgba(56, 189, 248, 0.35)"
                : "0 0 20px rgba(56, 189, 248, 0.1)",
            }}
            transition={{ duration: 0.6 }}
            className="relative z-20 w-32 h-32 rounded-3xl bg-background/95 border border-primary/50 flex flex-col items-center justify-center text-center shadow-2xl p-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-1.5">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
              OmniHub
            </span>
            <span className="text-[10px] text-primary font-medium">
              {isOrganized ? "Coordinating" : "Workspace Idle"}
            </span>
          </motion.div>

          {/* Loose Spatial Workbench Objects (Move & Align on organization) */}
          {WORKBENCH_ITEMS.map((item) => {
            const Icon = item.icon;
            const targetPos = isOrganized ? item.organizedPos : item.scatteredPos;
            return (
              <motion.div
                key={item.id}
                animate={{
                  x: `${targetPos.x * 5.2}px`,
                  y: `${targetPos.y * 5.2}px`,
                  rotate: targetPos.rotate,
                }}
                transition={{ type: "spring", stiffness: 120, damping: 14 }}
                className="absolute z-10 w-52 sm:w-60"
              >
                <div className="p-4 rounded-2xl bg-background/90 border border-border/80 shadow-xl backdrop-blur-md hover:border-primary/60 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: `${item.accent}18`, color: item.accent }}
                    >
                      {item.type}
                    </span>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground mb-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footnote */}
        <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Spatial alignment places scattered loose items into coordinated harmony.</span>
          <span className="text-primary flex items-center gap-1 font-sans">
            Visual Workbench <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </section>
  );
};
