import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, BookOpen, Calendar, CheckSquare, Layers, Sparkles } from "lucide-react";
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

const SAMPLE_DOMAINS = [
  {
    id: "edu",
    label: "Education",
    thought: "I need to create a personalized study plan for my students.",
    outcomes: [
      { icon: BookOpen, title: "12-Week Syllabus", subtitle: "Curriculum organized & mapped" },
      { icon: CheckSquare, title: "Adaptive Quizzes", subtitle: "Diagnostic test bank generated" },
      { icon: Calendar, title: "Schedule Synced", subtitle: "Class calendar & LMS updated" },
    ],
  },
  {
    id: "corp",
    label: "Corporate Operations",
    thought: "I need to triage incoming VIP support requests and follow up.",
    outcomes: [
      { icon: BookOpen, title: "Requests Categorized", subtitle: "Urgency levels assigned" },
      { icon: CheckSquare, title: "Contextual Drafts", subtitle: "Personalized replies ready" },
      { icon: Calendar, title: "CRM Synchronized", subtitle: "Team notified in real-time" },
    ],
  },
  {
    id: "fin",
    label: "Finance",
    thought: "I need to review this month's invoices and find any anomalies.",
    outcomes: [
      { icon: BookOpen, title: "1,240 Invoices Checked", subtitle: "Ledger parsed & verified" },
      { icon: CheckSquare, title: "3 Variances Flagged", subtitle: "Discrepancy alert prepared" },
      { icon: Calendar, title: "Executive Report", subtitle: "Ready for monthly review" },
    ],
  },
];

export const HowItWorksSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedDomainIdx, setSelectedDomainIdx] = useState(0);
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  const activeDomain = SAMPLE_DOMAINS[selectedDomainIdx];

  // Particle Stream from Left (Human Intent) -> Center (OmniAgent Coordination) -> Right (Tangible Outcomes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 1200);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 540);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight || 540;
    };

    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];
    const particleCount = 85;
    const colors = isDark
      ? ["#38BDF8", "#00F2FE", "#818CF8", "#34D399", "#67E8F9"]
      : ["#0284C7", "#0D9488", "#4F46E5", "#059669", "#0891B2"];

    const targets = [height * 0.22, height * 0.5, height * 0.78];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: height * 0.15 + Math.random() * (height * 0.7),
        vx: 1.2 + Math.random() * 1.8,
        vy: (Math.random() - 0.5) * 1.2,
        size: 2.0 + Math.random() * 2.5,
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
      const midY = height * 0.5;

      // 1. Draw Expanded Atmospheric Orchestration Aura
      const corridorGrad = ctx.createRadialGradient(midX, midY, 20, midX, midY, width * 0.35);
      if (isDark) {
        corridorGrad.addColorStop(0, "rgba(56, 189, 248, 0.14)");
        corridorGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.04)");
        corridorGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      } else {
        corridorGrad.addColorStop(0, "rgba(2, 132, 199, 0.12)");
        corridorGrad.addColorStop(0.5, "rgba(2, 132, 199, 0.03)");
        corridorGrad.addColorStop(1, "rgba(2, 132, 199, 0)");
      }
      ctx.fillStyle = corridorGrad;
      ctx.fillRect(0, 0, width, height);

      // Multi-layer Harmonic Pulsing Rings in Center
      ctx.save();
      ctx.translate(midX, midY);
      for (let r = 1; r <= 4; r++) {
        const radius = 34 * r + Math.sin(time * 2.2 + r * 1.2) * 6;
        ctx.strokeStyle = isDark
          ? `rgba(56, 189, 248, ${0.3 / r})`
          : `rgba(2, 132, 199, ${0.35 / r})`;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([8, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.setLineDash([]);

      // 2. Guide Rails toward Right Outcomes
      const rightChannelsY = [height * 0.22, height * 0.5, height * 0.78];
      rightChannelsY.forEach((targetY) => {
        const lineGrad = ctx.createLinearGradient(midX, midY, width - 40, targetY);
        lineGrad.addColorStop(0, isDark ? "rgba(56, 189, 248, 0.35)" : "rgba(2, 132, 199, 0.35)");
        lineGrad.addColorStop(0.7, isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(2, 132, 199, 0.2)");
        lineGrad.addColorStop(1, isDark ? "rgba(52, 211, 153, 0.5)" : "rgba(5, 150, 105, 0.5)");
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.bezierCurveTo(midX + 120, midY, midX + 220, targetY, width - 20, targetY);
        ctx.stroke();
      });

      // 3. Render Particles Moving Fluidly Across Viewport
      particles.forEach((p) => {
        p.x += p.vx;
        const progress = Math.max(0, Math.min(1, p.x / width));

        // Left region (0% - 40%): Organic waving particles from human intent
        if (progress < 0.4) {
          p.y += Math.sin(time * 2.5 + p.x * 0.015) * 1.1 + p.vy * 0.3;
        }
        // Center region (40% - 60%): Converging into central OmniCore
        else if (progress < 0.6) {
          p.y += (midY - p.y) * 0.09;
        }
        // Right region (60% - 100%): Branching into target outcome channels
        else {
          p.y += (p.targetY - p.y) * 0.13;
        }

        // Loop reset
        if (p.x > width - 10) {
          p.x = 20 + Math.random() * 40;
          p.y = height * 0.2 + Math.random() * (height * 0.6);
          p.targetY = rightChannelsY[Math.floor(Math.random() * rightChannelsY.length)];
        }

        // Draw particle
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.25 + 0.75 * progress;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Speed laser trails when aligned
        if (progress > 0.45) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.7;
          ctx.beginPath();
          ctx.moveTo(p.x - 14 * progress, p.y);
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
      id="how-it-works"
      className="relative min-h-screen py-32 px-4 sm:px-6 lg:px-12 xl:px-16 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Immersive Atmospheric Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[750px] bg-primary/5 rounded-full blur-[220px] pointer-events-none" />

      <div className="max-w-7xl xl:max-w-[1400px] mx-auto w-full relative z-10 flex flex-col justify-between">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="text-xs font-mono uppercase tracking-widest text-primary font-bold mb-3">
            HOW IT WORKS
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-tight">
            From an idea to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              tangible execution.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Human intent flows into autonomous coordination, materializing into verified results.
          </p>

          {/* Domain Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8">
            {SAMPLE_DOMAINS.map((domain, idx) => (
              <button
                key={domain.id}
                onClick={() => setSelectedDomainIdx(idx)}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-all duration-300 cursor-pointer ${
                  selectedDomainIdx === idx
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                {domain.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* 3 Stage Column Markers (No Box/Card Container!) */}
        <div className="hidden md:grid grid-cols-12 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6 pb-3 border-b border-border/40">
          <div className="col-span-4 text-left flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span className="font-bold text-foreground">01 · Human Intent</span>
          </div>
          <div className="col-span-4 text-center flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary font-bold">02 · OmniAgent Coordinates</span>
          </div>
          <div className="col-span-4 text-right flex items-center justify-end gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-bold text-foreground">03 · Tangible Outcomes</span>
          </div>
        </div>

        {/* IMMERSIVE FULL-WIDTH PAGE-LEVEL ORCHESTRATION CANVAS */}
        <div className="relative min-h-[520px] lg:min-h-[580px] flex flex-col md:flex-row items-center justify-between gap-8 lg:gap-12 py-8">
          {/* Background Living Particle Stream */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

          {/* LEFT — HUMAN INTENT */}
          <div className="relative z-10 w-full md:w-[32%] lg:w-[30%] max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeDomain.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.35 }}
                className="rounded-3xl border border-border/80 bg-card/75 backdrop-blur-xl p-6 sm:p-8 shadow-2xl hover:border-primary/50 transition-all"
              >
                <div className="text-[11px] font-mono text-muted-foreground uppercase mb-3 flex items-center justify-between">
                  <span className="font-bold text-primary">Natural Language Request</span>
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">
                  &quot;{activeDomain.thought}&quot;
                </p>
                <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-2.5 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  <span>Emitting plain language intent to OmniAgent...</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* CENTER — PROMINENT COORDINATION HUB */}
          <div className="relative z-10 text-center py-6 md:py-0 w-full md:w-[28%] lg:w-[26%] flex flex-col items-center pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.04, 1],
                boxShadow: [
                  "0 0 30px rgba(56, 189, 248, 0.2)",
                  "0 0 60px rgba(56, 189, 248, 0.4)",
                  "0 0 30px rgba(56, 189, 248, 0.2)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="p-6 sm:p-8 rounded-full bg-card/95 backdrop-blur-2xl border border-primary/60 shadow-2xl flex flex-col items-center justify-center text-center w-48 h-48 sm:w-56 sm:h-56"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary mb-3 shadow-inner">
                <Layers className="w-7 h-7 animate-pulse" />
              </div>
              <div className="text-xs sm:text-sm font-black text-foreground tracking-wider uppercase">
                Active Coordination
              </div>
              <div className="text-[11px] text-primary font-mono mt-1">
                Autonomous Synthesis
              </div>
            </motion.div>
          </div>

          {/* RIGHT — TANGIBLE OUTCOMES */}
          <div className="relative z-10 w-full md:w-[34%] lg:w-[32%] max-w-md flex flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeDomain.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col gap-3.5"
              >
                {activeDomain.outcomes.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-card/80 border border-emerald-500/40 backdrop-blur-xl shadow-xl hover:border-emerald-500/70 hover:scale-[1.02] transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left overflow-hidden flex-1">
                        <div className="text-sm sm:text-base font-bold text-foreground truncate">{item.title}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Editorial Line */}
        <div className="mt-12 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <span>Human thoughts effortlessly organized into verified, production deliverables.</span>
          <span className="text-primary flex items-center gap-1 font-sans font-semibold">
            Orchestration In Motion <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </section>
  );
};
