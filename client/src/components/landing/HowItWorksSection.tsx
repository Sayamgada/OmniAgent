import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, BookOpen, Calendar, CheckSquare, Layers, Sparkles } from "lucide-react";
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
  const sectionRef = useRef<HTMLElement | null>(null);
  const [selectedDomainIdx, setSelectedDomainIdx] = useState(0);
  const isVisibleRef = useRef(true);

  const { siteTheme, variant } = useSiteTheme();
  const isDark = siteTheme === "dark";
  const activeDomain = SAMPLE_DOMAINS[selectedDomainIdx];

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Particle Stream from Left (Human Intent) -> Center (OmniAgent Coordination) -> Right (Tangible Outcomes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let isRunning = true;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 1200);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 540);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight || 540;
    };

    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];
    const particleCount = 75;
    const pal = variant.canvasPalette[siteTheme];
    const colors = pal.particles || (isDark ? ["#38BDF8", "#00F2FE", "#818CF8"] : ["#0284C7", "#0D9488"]);

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
      if (!isRunning) return;

      if (!isVisibleRef.current) {
        animId = requestAnimationFrame(render);
        return;
      }

      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const midX = width * 0.5;
      const midY = height * 0.5;

      // 1. Draw Expanded Atmospheric Orchestration Aura
      const corridorGrad = ctx.createRadialGradient(midX, midY, 20, midX, midY, width * 0.35);
      corridorGrad.addColorStop(0, `${pal.primary}22`);
      corridorGrad.addColorStop(0.5, `${pal.primary}08`);
      corridorGrad.addColorStop(1, `${pal.primary}00`);
      ctx.fillStyle = corridorGrad;
      ctx.fillRect(0, 0, width, height);

      // Multi-layer Harmonic Pulsing Rings in Center
      ctx.save();
      ctx.translate(midX, midY);
      for (let r = 1; r <= 4; r++) {
        const radius = 34 * r + Math.sin(time * 2.2 + r * 1.2) * 6;
        ctx.strokeStyle = `${pal.primary}${Math.round((0.35 / r) * 255).toString(16).padStart(2, "0")}`;
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
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.bezierCurveTo(midX + width * 0.15, midY, midX + width * 0.22, targetY, width * 0.92, targetY);
        ctx.strokeStyle = `${pal.secondary}20`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // 3. Update & Draw Particles (Intent -> Coordination -> Domain Outputs)
      particles.forEach((p) => {
        p.progress += 0.0035 * p.vx;
        if (p.progress > 1) {
          p.progress = 0;
          p.x = width * 0.08;
          p.y = height * 0.25 + Math.random() * (height * 0.5);
          p.targetY = targets[Math.floor(Math.random() * targets.length)];
          p.color = colors[Math.floor(Math.random() * colors.length)];
        }

        const tProg = p.progress;

        if (tProg < 0.5) {
          const u = tProg / 0.5;
          p.x = width * 0.08 + (midX - width * 0.08) * u;
          const startY = height * 0.5 + Math.sin(tProg * 12 + time) * 70;
          p.y = startY + (midY - startY) * u;
        } else {
          const u = (tProg - 0.5) / 0.5;
          const cp1x = midX + width * 0.16;
          const cp1y = midY;
          const cp2x = midX + width * 0.25;
          const cp2y = p.targetY;
          const endX = width * 0.95;
          const endY = p.targetY;

          const invU = 1 - u;
          p.x = invU * invU * invU * midX + 3 * invU * invU * u * cp1x + 3 * invU * u * u * cp2x + u * u * u * endX;
          p.y = invU * invU * invU * midY + 3 * invU * invU * u * cp1y + 3 * invU * u * u * cp2y + u * u * u * endY;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [siteTheme, variant]);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative min-h-[95vh] py-32 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Ambient background soft light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[650px] bg-primary/5 rounded-full blur-[220px] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full relative z-10 flex flex-col">
        {/* Section Header */}
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">
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

        {/* 3 Stage Column Markers */}
        <div className="hidden md:grid grid-cols-12 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6 pb-3 border-b border-border/40">
          <div className="col-span-4 text-left flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="font-bold text-foreground">01 · Human Intent</span>
          </div>
          <div className="col-span-4 text-center flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary font-bold">02 · OmniAgent Coordinates</span>
          </div>
          <div className="col-span-4 text-right flex items-center justify-end gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
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
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
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
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="p-6 sm:p-8 rounded-full bg-card/95 backdrop-blur-2xl border border-primary/60 shadow-2xl flex flex-col items-center justify-center text-center w-48 h-48 sm:w-56 sm:h-56 ring-8 ring-primary/10"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary mb-3 shadow-inner">
                <Layers className="w-7 h-7 animate-pulse" />
              </div>
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-foreground">
                OmniAgent Core
              </span>
              <span className="text-[10px] font-mono text-primary mt-1 font-semibold">
                Autonomous Assembly
              </span>
            </motion.div>
          </div>

          {/* RIGHT — TANGIBLE OUTCOMES */}
          <div className="relative z-10 w-full md:w-[36%] lg:w-[34%] max-w-md space-y-3.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeDomain.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className="space-y-3"
              >
                {activeDomain.outcomes.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-4 sm:p-4.5 shadow-xl flex items-center justify-between hover:border-primary/50 transition-all group cursor-default"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {item.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                      <CheckCircle2 className="w-4.5 h-4.5 text-primary opacity-80" />
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Verification Banner */}
        <div className="mt-12 text-center text-xs font-mono text-muted-foreground">
          <span>Deterministic execution · Continuous validation · Zero manual orchestrator glue</span>
        </div>
      </div>
    </section>
  );
};
