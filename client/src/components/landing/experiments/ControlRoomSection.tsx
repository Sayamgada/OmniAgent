import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Play, Clock, CheckCircle2 } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

interface StatusState {
  id: "moving" | "waiting" | "done";
  label: string;
  count: number;
  color: string;
  badgeColor: string;
  summary: string;
  items: string[];
}

const CONTROL_STATES: StatusState[] = [
  {
    id: "moving",
    label: "Moving",
    count: 3,
    color: "#38BDF8",
    badgeColor: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    summary: "3 tasks currently in active autonomous execution.",
    items: [
      "Synthesizing 12-week quantum physics syllabus & quiz rubrics",
      "Reconciling Q3 ledger feeds against 1,420 raw invoices",
      "Preparing executive market summary for tomorrow's client brief",
    ],
  },
  {
    id: "waiting",
    label: "Waiting",
    count: 2,
    color: "#F59E0B",
    badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    summary: "2 items paused for human decision or external receipt.",
    items: [
      "Waiting for manager approval on vendor contract exceptions",
      "Awaiting client W-9 tax attachment before dispatch",
    ],
  },
  {
    id: "done",
    label: "Done",
    count: 8,
    color: "#10B981",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    summary: "8 deliverables completed and verified today.",
    items: [
      "Student diagnostic quizzes published to Canvas LMS",
      "VIP customer support inquiries resolved & CRM updated",
      "Monthly variance report delivered to executive inbox",
    ],
  },
];

export const ControlRoomSection: React.FC = () => {
  const [selectedStateId, setSelectedStateId] = useState<"moving" | "waiting" | "done">("moving");
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  const currentState = CONTROL_STATES.find((s) => s.id === selectedStateId) || CONTROL_STATES[0];

  return (
    <section
      id="control-room"
      className="relative min-h-screen py-32 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Dev Marker */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>03 · THE CONTROL ROOM</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.08]">
            Know what&apos;s happening.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              Not how it&apos;s happening.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A calm, minimal oversight space. No dashboards, no KPI charts — just tranquil visibility.
          </p>
        </motion.div>

        {/* Spatial Status Stage (NO Analytics Dashboard / NO Tables!) */}
        <div className="relative rounded-3xl border border-border/80 bg-card/60 backdrop-blur-2xl shadow-2xl p-6 sm:p-10 lg:p-14 overflow-hidden">
          {/* Top Status Selector Nodes */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-12">
            {CONTROL_STATES.map((state) => {
              const isSelected = selectedStateId === state.id;
              return (
                <button
                  key={state.id}
                  onClick={() => setSelectedStateId(state.id)}
                  className={`relative flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? "bg-background border-primary shadow-xl scale-105"
                      : "bg-background/50 border-border/70 hover:border-border hover:bg-background/80"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{ backgroundColor: state.color }}
                  />
                  <span className="text-sm sm:text-base font-bold text-foreground">
                    {state.label}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${state.badgeColor}`}
                  >
                    {state.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active State Details Canvas */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentState.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto text-center space-y-6"
            >
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Current Status Summary
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
                {currentState.summary}
              </h3>

              {/* Human-Readable Tasks List */}
              <div className="space-y-3 pt-4 text-left">
                {currentState.items.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-background/80 border border-border/70 shadow-xs"
                  >
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: currentState.color }}
                    />
                    <span className="text-xs sm:text-sm font-medium text-foreground/90 leading-relaxed">
                      {item}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Footer Note */}
          <div className="mt-12 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>Calm oversight replaces endless status syncs and dashboard monitoring.</span>
            <span className="text-primary flex items-center gap-1 font-sans">
              Tranquil Control <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
