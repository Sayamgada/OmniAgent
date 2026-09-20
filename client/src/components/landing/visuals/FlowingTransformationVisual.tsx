import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

interface StreamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  progress: number; // 0 (left - chaotic) to 1 (right - structured)
  channel: number; // Target structured y-channel on the right
  alpha: number;
  color: string;
}

const PRESET_INTENTS = [
  {
    id: "student",
    label: "Student Guidance",
    prompt: "Create a study path from lecture notes and quiz students on weak areas",
    outcomes: ["Syllabus Extracted", "12 Adaptive Quizzes Ready", "Canvas LMS Synced"],
  },
  {
    id: "finance",
    label: "Fiscal Audit",
    prompt: "Reconcile vendor invoices against Q3 accounts and flag variance over 2%",
    outcomes: ["1,420 Records Parsed", "3 Discrepancies Flagged", "Audit Memo Generated"],
  },
  {
    id: "operations",
    label: "Customer Support",
    prompt: "Triage incoming VIP tickets, draft verified replies, and update CRM",
    outcomes: ["VIP Urgency Assigned", "Context-Rich Drafts Ready", "HubSpot Updated"],
  },
];

export const FlowingTransformationVisual: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  const activePreset = PRESET_INTENTS[activePresetIndex];

  // Typing effect for the prompt
  useEffect(() => {
    setIsTyping(true);
    setDisplayedText("");
    const target = activePreset.prompt;
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx <= target.length) {
        setDisplayedText(target.slice(0, currentIdx));
        currentIdx++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 22);

    return () => clearInterval(interval);
  }, [activePresetIndex, activePreset.prompt]);

  // Particle Stream Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 320);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 320;
    };

    window.addEventListener("resize", handleResize);

    const particles: StreamParticle[] = [];
    const particleCount = 75;

    // Palette definition
    const baseColors = isDark
      ? ["#38BDF8", "#00F2FE", "#818CF8", "#34D399"]
      : ["#0284C7", "#0D9488", "#4F46E5", "#059669"];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * (width * 0.3),
        y: height * 0.2 + Math.random() * (height * 0.6),
        vx: 1.2 + Math.random() * 1.8,
        vy: (Math.random() - 0.5) * 1.4,
        size: 2 + Math.random() * 2.5,
        progress: Math.random(),
        channel: Math.floor(Math.random() * 3), // 3 clean output channels
        alpha: 0.2 + Math.random() * 0.7,
        color: baseColors[Math.floor(Math.random() * baseColors.length)],
      });
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Subtle Background Transformation Corridor
      const midX = width * 0.5;
      const corridorWidth = width * 0.24;
      const gradient = ctx.createLinearGradient(midX - corridorWidth, 0, midX + corridorWidth, 0);

      if (isDark) {
        gradient.addColorStop(0, "rgba(56, 189, 248, 0)");
        gradient.addColorStop(0.5, "rgba(56, 189, 248, 0.06)");
        gradient.addColorStop(1, "rgba(52, 211, 153, 0)");
      } else {
        gradient.addColorStop(0, "rgba(2, 132, 199, 0)");
        gradient.addColorStop(0.5, "rgba(2, 132, 199, 0.05)");
        gradient.addColorStop(1, "rgba(5, 150, 105, 0)");
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(midX - corridorWidth, 20, corridorWidth * 2, height - 40);

      // Subtle Center Prismatic Alignment Line
      ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(2, 132, 199, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(midX, 30);
      ctx.lineTo(midX, height - 30);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw 3 Structured Target Output Guide Rails on the Right
      const rightChannelsY = [height * 0.28, height * 0.5, height * 0.72];
      rightChannelsY.forEach((chY) => {
        const railGrad = ctx.createLinearGradient(midX + 40, chY, width - 20, chY);
        railGrad.addColorStop(0, isDark ? "rgba(56, 189, 248, 0.1)" : "rgba(2, 132, 199, 0.1)");
        railGrad.addColorStop(1, isDark ? "rgba(52, 211, 153, 0.3)" : "rgba(5, 150, 105, 0.3)");
        ctx.strokeStyle = railGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(midX + 40, chY);
        ctx.lineTo(width - 20, chY);
        ctx.stroke();
      });

      // 3. Update and Draw Flowing Particles
      particles.forEach((p) => {
        // As particle moves across screen, progress goes 0 -> 1
        const progress = Math.max(0, Math.min(1, p.x / width));
        const targetY = rightChannelsY[p.channel];

        // Left region (0.0 to 0.4): fluid, undulating, organic
        if (progress < 0.4) {
          p.y += Math.sin(time * 2 + p.x * 0.02) * 0.8 + (Math.random() - 0.5) * 0.5;
          p.x += p.vx * 1.1;
        }
        // Center region (0.4 to 0.65): converging into parallel channels
        else if (progress < 0.65) {
          const convergenceRate = 0.08;
          p.y += (targetY - p.y) * convergenceRate;
          p.x += p.vx * 1.3;
        }
        // Right region (0.65 to 1.0): clean, structured, linear laser stream
        else {
          p.y += (targetY - p.y) * 0.15; // Locked in track
          p.x += p.vx * 1.6;
        }

        // Reset when particle reaches right edge
        if (p.x > width - 15) {
          p.x = 20 + Math.random() * 40;
          p.y = height * 0.2 + Math.random() * (height * 0.6);
          p.channel = Math.floor(Math.random() * 3);
        }

        // Draw particle with speed trail
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw soft forward glow/trail
        if (progress > 0.4) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.7;
          ctx.beginPath();
          ctx.moveTo(p.x - 8 * (progress + 0.5), p.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      });

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isDark]);

  return (
    <div ref={containerRef} className="w-full max-w-5xl mx-auto">
      {/* Top Preset Pills Selector */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground mr-1">
          Try An Intent:
        </span>
        {PRESET_INTENTS.map((preset, idx) => {
          const isActive = idx === activePresetIndex;
          return (
            <button
              key={preset.id}
              onClick={() => setActivePresetIndex(idx)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1.5 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
              }`}
            >
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Transformation Canvas Stage */}
      <div className="relative rounded-3xl border border-border/80 bg-card/75 backdrop-blur-xl p-6 sm:p-8 lg:p-10 shadow-2xl overflow-hidden">
        {/* Subtle Ambient Background Light */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* 3 Stage Labels */}
        <div className="grid grid-cols-3 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border/40">
          <div className="text-left flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            <span>01. Natural Intent</span>
          </div>
          <div className="text-center">
            <span className="text-primary font-semibold">02. Transformation</span>
          </div>
          <div className="text-right flex items-center justify-end gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>03. Structured Result</span>
          </div>
        </div>

        {/* Stage Content Overlay & Canvas */}
        <div className="relative min-h-[320px] flex items-center">
          {/* Background Particle Transformation Stream */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

          {/* Left: Interactive Input Card */}
          <div className="relative z-10 w-[34%] max-w-[280px] bg-background/80 backdrop-blur-md rounded-2xl p-4 border border-border/80 shadow-lg">
            <div className="text-[11px] font-mono text-muted-foreground uppercase mb-2 flex items-center justify-between">
              <span>User Description</span>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-foreground leading-relaxed min-h-[72px]">
              &quot;{displayedText}&quot;
              {isTyping && <span className="inline-block w-1 h-3.5 bg-primary ml-1 animate-pulse" />}
            </div>
          </div>

          {/* Right: Structured Outcome Badges */}
          <div className="relative z-10 ml-auto w-[36%] max-w-[300px] flex flex-col gap-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePreset.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-2.5"
              >
                {activePreset.outcomes.map((outcome, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.12 }}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-background/85 border border-emerald-500/30 backdrop-blur-md shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">{outcome}</span>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Caption */}
        <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-sans">No complex prompt engineering or manual glue code.</span>
          <span className="font-mono text-primary flex items-center gap-1">
            Living Stream <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
