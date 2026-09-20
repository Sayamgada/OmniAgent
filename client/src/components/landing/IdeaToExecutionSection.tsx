import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, CheckCircle2, BookOpen, Calendar, CheckSquare, Layers } from "lucide-react";
import { useSiteTheme } from "../../context/ThemeContext";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  progress: number;
  color: string;
  targetY: number;
}

const SAMPLE_IDEAS = [
  {
    id: "edu",
    thought: "I need to create a personalized study plan for my students.",
    outcomes: [
      { icon: BookOpen, title: "12-Week Syllabus", subtitle: "Curriculum Organized" },
      { icon: CheckSquare, title: "Adaptive Quizzes", subtitle: "Diagnostic tests generated" },
      { icon: Calendar, title: "Schedule Synced", subtitle: "Class calendar & LMS updated" },
    ],
  },
  {
    id: "fin",
    thought: "I need to review this month's invoices and find any anomalies.",
    outcomes: [
      { icon: BookOpen, title: "1,240 Invoices Checked", subtitle: "Ledger parsed & verified" },
      { icon: CheckSquare, title: "3 Variances Flagged", subtitle: "Discrepancy alert prepared" },
      { icon: Calendar, title: "Executive Report", subtitle: "Ready for monthly review" },
    ],
  },
  {
    id: "biz",
    thought: "I need to triage incoming VIP support requests and follow up.",
    outcomes: [
      { icon: BookOpen, title: "Requests Categorized", subtitle: "Urgency levels assigned" },
      { icon: CheckSquare, title: "Contextual Drafts", subtitle: "Personalized replies ready" },
      { icon: Calendar, title: "CRM Synchronized", subtitle: "Team notified in real-time" },
    ],
  },
];

export const IdeaToExecutionSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedIdeaIdx, setSelectedIdeaIdx] = useState(0);
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  const activeIdea = SAMPLE_IDEAS[selectedIdeaIdx];

  // Particle Stream from Left (Messy Idea) -> Center (Living Orchestrator) -> Right (Clean Results)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 900);
    let height = (canvas.height = 360);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 360;
    };

    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];
    const particleCount = 60;
    const colors = isDark
      ? ["#38BDF8", "#00F2FE", "#818CF8", "#34D399"]
      : ["#0284C7", "#0D9488", "#4F46E5", "#059669"];

    const targets = [height * 0.28, height * 0.5, height * 0.72];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: height * 0.2 + Math.random() * (height * 0.6),
        vx: 1.0 + Math.random() * 1.5,
        vy: (Math.random() - 0.5) * 1.0,
        size: 1.8 + Math.random() * 2.2,
        progress: Math.random(),
        color: colors[Math.floor(Math.random() * colors.length)],
        targetY: targets[Math.floor(Math.random() * targets.length)],
      });
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const midX = width * 0.5;

      // 1. Draw Central Living Orchestration Corridor
      const corridorGrad = ctx.createRadialGradient(midX, height * 0.5, 10, midX, height * 0.5, width * 0.25);
      if (isDark) {
        corridorGrad.addColorStop(0, "rgba(56, 189, 248, 0.09)");
        corridorGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      } else {
        corridorGrad.addColorStop(0, "rgba(2, 132, 199, 0.07)");
        corridorGrad.addColorStop(1, "rgba(2, 132, 199, 0)");
      }
      ctx.fillStyle = corridorGrad;
      ctx.fillRect(midX - width * 0.25, 0, width * 0.5, height);

      // Central Harmonic Rings
      ctx.save();
      ctx.translate(midX, height * 0.5);
      for (let r = 1; r <= 3; r++) {
        const radius = 28 * r + Math.sin(time * 2 + r) * 4;
        ctx.strokeStyle = isDark
          ? `rgba(56, 189, 248, ${0.25 / r})`
          : `rgba(2, 132, 199, ${0.3 / r})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.setLineDash([]);

      // 2. Connecting Stream Guide Rails to the Right Outcomes
      targets.forEach((targetY) => {
        const lineGrad = ctx.createLinearGradient(midX, height * 0.5, width - 20, targetY);
        lineGrad.addColorStop(0, isDark ? "rgba(56, 189, 248, 0.25)" : "rgba(2, 132, 199, 0.25)");
        lineGrad.addColorStop(1, isDark ? "rgba(52, 211, 153, 0.4)" : "rgba(5, 150, 105, 0.4)");
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(midX, height * 0.5);
        ctx.bezierCurveTo(midX + 80, height * 0.5, midX + 120, targetY, width - 10, targetY);
        ctx.stroke();
      });

      // 3. Render Particles Moving Along the Journey
      particles.forEach((p) => {
        p.x += p.vx;
        const progress = Math.max(0, Math.min(1, p.x / width));

        // Phase 1 (Left 0% - 40%): Organic human idea, waving particles
        if (progress < 0.4) {
          p.y += Math.sin(time * 2 + p.x * 0.02) * 0.8 + p.vy * 0.2;
        }
        // Phase 2 (Center 40% - 60%): Convergence into central intelligence
        else if (progress < 0.6) {
          const convergenceY = height * 0.5;
          p.y += (convergenceY - p.y) * 0.08;
        }
        // Phase 3 (Right 60% - 100%): Splitting into clean structured outcome tracks
        else {
          p.y += (p.targetY - p.y) * 0.12;
        }

        // Loop reset
        if (p.x > width - 15) {
          p.x = 20 + Math.random() * 30;
          p.y = height * 0.25 + Math.random() * (height * 0.5);
          p.targetY = targets[Math.floor(Math.random() * targets.length)];
        }

        // Draw particle
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.3 + 0.7 * progress;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Speed line when organized
        if (progress > 0.5) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x - 10 * progress, p.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      });

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isDark]);

  return (
    <section
      id="execution"
      className="relative py-32 px-4 sm:px-6 lg:px-8 bg-background border-t border-border/40 text-foreground transition-colors duration-350 overflow-hidden"
    >
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>02 — LIVING TRANSFORMATION</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            From an idea to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              something that works.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Describe what you need. OmniAgent coordinates the steps, organizes the work, and delivers real results.
          </p>
        </motion.div>

        {/* Quick Idea Switcher Pills */}
        <div className="flex justify-center gap-2 mb-8">
          {SAMPLE_IDEAS.map((idea, idx) => (
            <button
              key={idea.id}
              onClick={() => setSelectedIdeaIdx(idx)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                selectedIdeaIdx === idx
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
              }`}
            >
              Example 0{idx + 1}
            </button>
          ))}
        </div>

        {/* SINGLE CONTINUOUS PROGRESSIVE TRANSFORMATION SCENE (NO 3-Card Grid!) */}
        <div className="relative rounded-3xl border border-border/80 bg-card/75 backdrop-blur-xl shadow-2xl p-6 sm:p-10 lg:p-12 overflow-hidden">
          {/* Top Label Markers */}
          <div className="grid grid-cols-3 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6 pb-3 border-b border-border/40">
            <div className="text-left flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Human Intent</span>
            </div>
            <div className="text-center flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-primary font-semibold">OmniAgent Coordinates</span>
            </div>
            <div className="text-right flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Tangible Outcome</span>
            </div>
          </div>

          {/* Interactive Visual Canvas Container */}
          <div className="relative min-h-[360px] flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Background Kinetic Stream */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

            {/* LEFT — THE IDEA (Organic Floating Human Thought) */}
            <div className="relative z-10 w-full md:w-[32%] max-w-sm">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIdea.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-2xl border border-border/80 bg-background/85 backdrop-blur-md p-5 shadow-lg relative group"
                >
                  <div className="text-[11px] font-mono text-muted-foreground uppercase mb-2 flex items-center justify-between">
                    <span>Your Idea</span>
                    <span className="text-sky-500 font-sans text-xs">Plain Words</span>
                  </div>
                  <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed">
                    &quot;{activeIdea.thought}&quot;
                  </p>
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                    <span>Emitting natural intent...</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* CENTER — LIVING ORCHESTRATION ZONE */}
            <div className="relative z-10 text-center py-4 md:py-0 w-full md:w-[28%] pointer-events-none">
              <div className="inline-flex flex-col items-center justify-center p-4 rounded-2xl bg-background/60 backdrop-blur-md border border-primary/20 shadow-md">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-2 animate-spin-slow">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-foreground tracking-tight">Active Intelligence</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Organizing steps & tools</div>
              </div>
            </div>

            {/* RIGHT — THE RESULT (Materialized Outcome Elements) */}
            <div className="relative z-10 w-full md:w-[34%] max-w-sm flex flex-col gap-2.5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIdea.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.35 }}
                  className="flex flex-col gap-2.5"
                >
                  {activeIdea.outcomes.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.12 }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background/90 border border-emerald-500/30 backdrop-blur-md shadow-sm hover:border-emerald-500/60 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <div className="text-xs font-bold text-foreground truncate">{item.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{item.subtitle}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-8 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Messy human thoughts effortlessly organized into verified, actionable execution.</span>
            <span className="font-mono text-primary flex items-center gap-1 font-medium">
              Seamless Flow <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
