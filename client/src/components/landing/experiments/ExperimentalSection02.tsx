import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, CheckCircle2, FileText, Search, Calendar, Mail } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

interface StreamParticle {
  x: number;
  y: number;
  speed: number;
  channel: number; // 0, 1, 2, 3
  size: number;
  alpha: number;
}

const ACTION_CHANNELS = [
  { id: 0, title: "Deep Research", desc: "Competitor analysis & client history", icon: Search, color: "#38BDF8" },
  { id: 1, title: "Document Synthesis", desc: "Briefing deck & tailored proposal", icon: FileText, color: "#818CF8" },
  { id: 2, title: "Calendar & Logistics", desc: "Meeting room booked & invites sent", icon: Calendar, color: "#34D399" },
  { id: 3, title: "Follow-Up Drafts", desc: "Pre-written summaries & next steps", icon: Mail, color: "#F59E0B" },
];

export const ExperimentalSection02: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  // Branching River Stream Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 900);
    let height = (canvas.height = 400);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 400;
    };

    window.addEventListener("resize", handleResize);

    const channelY = [height * 0.18, height * 0.38, height * 0.62, height * 0.82];
    const particles: StreamParticle[] = [];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * width,
        y: height * 0.5,
        speed: 1.4 + Math.random() * 1.8,
        channel: Math.floor(Math.random() * 4),
        size: 2 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.7,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const startX = width * 0.18;
      const branchStartX = width * 0.32;
      const branchEndX = width * 0.68;
      const endX = width * 0.88;
      const centerY = height * 0.5;

      // 1. Draw River Stream Paths
      // Single Entry Stream
      const entryGrad = ctx.createLinearGradient(startX, centerY, branchStartX, centerY);
      entryGrad.addColorStop(0, isDark ? "rgba(56, 189, 248, 0.6)" : "rgba(2, 132, 199, 0.6)");
      entryGrad.addColorStop(1, isDark ? "rgba(56, 189, 248, 0.3)" : "rgba(2, 132, 199, 0.3)");
      ctx.strokeStyle = entryGrad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(startX, centerY);
      ctx.lineTo(branchStartX, centerY);
      ctx.stroke();

      // Branching Out Streams
      channelY.forEach((chY, idx) => {
        const color = ACTION_CHANNELS[idx].color;
        const branchGrad = ctx.createLinearGradient(branchStartX, centerY, endX, centerY);
        branchGrad.addColorStop(0, isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(2, 132, 199, 0.2)");
        branchGrad.addColorStop(0.3, color + "60");
        branchGrad.addColorStop(0.7, color + "80");
        branchGrad.addColorStop(1, isDark ? "rgba(52, 211, 153, 0.7)" : "rgba(5, 150, 105, 0.7)");

        ctx.strokeStyle = branchGrad;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        // Branch out
        ctx.moveTo(branchStartX, centerY);
        ctx.bezierCurveTo(branchStartX + 60, centerY, branchStartX + 40, chY, branchStartX + 100, chY);
        // Flow through channel
        ctx.lineTo(branchEndX - 40, chY);
        // Reconverge to result
        ctx.bezierCurveTo(branchEndX + 20, chY, branchEndX + 40, centerY, endX, centerY);
        ctx.stroke();
      });

      // 2. Animate River Water/Light Particles along the Branching Flow
      particles.forEach((p) => {
        p.x += p.speed;
        const targetY = channelY[p.channel];

        // Region 1: Single stream before branch
        if (p.x < branchStartX) {
          p.y += (centerY - p.y) * 0.15;
        }
        // Region 2: Branching out into parallel channels
        else if (p.x < branchStartX + 100) {
          const t = (p.x - branchStartX) / 100;
          p.y += (targetY - p.y) * (0.05 + t * 0.1);
        }
        // Region 3: Flowing through parallel channel
        else if (p.x < branchEndX) {
          p.y = targetY + Math.sin(time * 3 + p.x * 0.05) * 2;
        }
        // Region 4: Reconverging to single output point
        else if (p.x < endX) {
          p.y += (centerY - p.y) * 0.12;
        } else {
          p.y = centerY;
        }

        // Reset loop
        if (p.x > endX + 30) {
          p.x = startX - 10;
          p.y = centerY;
          p.channel = Math.floor(Math.random() * 4);
        }

        const color = ACTION_CHANNELS[p.channel].color;
        ctx.fillStyle = color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Subtle fluid trail
        ctx.strokeStyle = color;
        ctx.lineWidth = p.size * 0.8;
        ctx.beginPath();
        ctx.moveTo(p.x - 8, p.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
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
      id="experiment-02"
      className="relative min-h-screen py-32 px-4 sm:px-6 lg:px-8 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Dev Label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>EXPERIMENT 02 — ONE REQUEST, MANY ACTIONS</span>
        </div>
      </div>

      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-sky-500/5 rounded-full blur-[170px] pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            One request.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              Everything it takes to get it done.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A single prompt branches into research, documents, schedules, and follow-ups — converging into a unified result.
          </p>
        </motion.div>

        {/* Branching River Visual Arena */}
        <div className="relative rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-2xl p-6 sm:p-10 overflow-hidden">
          {/* Top Label Markers */}
          <div className="grid grid-cols-3 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4 pb-3 border-b border-border/40">
            <div className="text-left flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>One Natural Request</span>
            </div>
            <div className="text-center">
              <span className="text-primary font-semibold">4 Coordinated Action Streams</span>
            </div>
            <div className="text-right flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Unified Outcome</span>
            </div>
          </div>

          {/* Interactive Flow Stage with Canvas */}
          <div className="relative min-h-[400px] flex items-center justify-between">
            {/* Background River Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

            {/* Left: One Simple Request Card */}
            <div className="relative z-10 w-[26%] max-w-[240px]">
              <div className="p-4 sm:p-5 rounded-2xl bg-background/90 border border-primary/40 shadow-xl backdrop-blur-md">
                <div className="text-[10px] font-mono text-primary uppercase font-bold mb-1.5">
                  Incoming Intent
                </div>
                <p className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                  &quot;Prepare everything for tomorrow&apos;s client meeting.&quot;
                </p>
              </div>
            </div>

            {/* Middle: 4 Branching Action Nodes */}
            <div className="relative z-10 w-[42%] max-w-md flex flex-col gap-3 py-2">
              {ACTION_CHANNELS.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.id}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-background/85 border border-border/70 backdrop-blur-md shadow-sm hover:border-primary/50 transition-all"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${action.color}20`, color: action.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-left overflow-hidden">
                      <div className="text-xs font-bold text-foreground truncate">{action.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{action.desc}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Right: Unified Final Outcome */}
            <div className="relative z-10 w-[26%] max-w-[240px]">
              <div className="p-4 sm:p-5 rounded-2xl bg-background/90 border border-emerald-500/50 shadow-xl backdrop-blur-md text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-500 font-bold uppercase mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Meeting Ready</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-foreground">
                  Briefing Deck, Invite &amp; Next Steps Complete
                </div>
                <div className="mt-3 pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground">
                  Ready in 2.8s
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Branching intelligence handles multi-step operational complexity automatically.</span>
            <span className="font-mono text-primary flex items-center gap-1">
              Flowing Stream <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
