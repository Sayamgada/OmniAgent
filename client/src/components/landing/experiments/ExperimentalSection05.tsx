import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Landmark, Building2, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

type RealmType = "education" | "finance" | "business";

interface RealmData {
  id: RealmType;
  label: string;
  icon: React.ElementType;
  tagline: string;
  subtext: string;
  themeHue: string;
  elements: string[];
  ambientColor: string;
}

const REALMS: RealmData[] = [
  {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    tagline: "Adaptive Pedagogy & Knowledge Realms",
    subtext: "Transforms surrounding space into dynamic curriculum pathways, diagnostic quizzes, and student mastery curves.",
    themeHue: "#38BDF8",
    elements: ["12-Week Syllabus", "Personalized Quizzes", "Student Mastery 99%", "Canvas LMS Synced"],
    ambientColor: "rgba(56, 189, 248, 0.15)",
  },
  {
    id: "finance",
    label: "Finance",
    icon: Landmark,
    tagline: "Audit-Ready Fiscal Ecosystem",
    subtext: "Reconfigures the atmosphere into real-time transaction reconciliation, invoice anomaly filters, and executive statements.",
    themeHue: "#10B981",
    elements: ["1,420 Ledgers Reconciled", "Zero Discrepancies", "SEC Edgar Summary", "Audit Trail Verified"],
    ambientColor: "rgba(16, 185, 129, 0.15)",
  },
  {
    id: "business",
    label: "Business",
    icon: Building2,
    tagline: "Autonomous Operations & SLA Grid",
    subtext: "Morphs into priority customer triage, multi-tool sync channels, and automated cross-department task resolution.",
    themeHue: "#06B6D4",
    elements: ["VIP Tickets Routed", "Contextual Email Drafts", "CRM Deal Synced", "92% Auto-Resolved"],
    ambientColor: "rgba(6, 182, 212, 0.15)",
  },
];

export const ExperimentalSection05: React.FC = () => {
  const [activeRealmId, setActiveRealmId] = useState<RealmType>("education");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  const currentRealm = REALMS.find((r) => r.id === activeRealmId) || REALMS[0];

  // Immersive Spatial Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 900);
    let height = (canvas.height = 440);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 440;
    };

    window.addEventListener("resize", handleResize);

    let time = 0;
    const particles = Array.from({ length: 45 }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: 80 + Math.random() * 200,
      speed: 0.005 + Math.random() * 0.01,
      size: 2 + Math.random() * 2.5,
    }));

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const centerX = width * 0.5;
      const centerY = height * 0.5;

      // 1. Full-Canvas Ambient Morphing Aura
      const aura = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, width * 0.5);
      aura.addColorStop(0, currentRealm.ambientColor);
      aura.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, width, height);

      // 2. Spatial Concentric Gravitational Rings
      ctx.save();
      ctx.translate(centerX, centerY);
      for (let r = 1; r <= 4; r++) {
        const rad = 60 * r + Math.sin(time + r) * 6;
        ctx.strokeStyle = isDark
          ? `rgba(255, 255, 255, ${0.12 / r})`
          : `rgba(15, 23, 42, ${0.15 / r})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.setLineDash([]);

      // 3. Floating Realm Particles around the Core
      particles.forEach((p) => {
        p.angle += p.speed;
        const px = centerX + Math.cos(p.angle) * p.dist;
        const py = centerY + Math.sin(p.angle) * p.dist * 0.7;

        ctx.fillStyle = currentRealm.themeHue;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [currentRealm, isDark]);

  return (
    <section
      id="experiment-05"
      className="relative min-h-screen py-32 px-4 sm:px-6 lg:px-8 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Dev Label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>EXPERIMENT 05 — ONE CORE, MANY WORLDS</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            One core.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              Infinite environments.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            The central intelligence remains constant. The entire surrounding realm morphs to your domain.
          </p>
        </motion.div>

        {/* Minimal Realm Selector Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 rounded-full bg-card/90 border border-border/80 shadow-md backdrop-blur-xl">
            {REALMS.map((realm) => {
              const Icon = realm.icon;
              const isActive = activeRealmId === realm.id;
              return (
                <button
                  key={realm.id}
                  onClick={() => setActiveRealmId(realm.id)}
                  className={`relative flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? "text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="realmActiveTab"
                      className="absolute inset-0 bg-primary rounded-full"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
                    />
                  )}
                  <Icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{realm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Full Spatial Morphing Scene */}
        <div className="relative h-[440px] sm:h-[480px] rounded-3xl border border-border/80 bg-card/70 backdrop-blur-2xl shadow-2xl overflow-hidden flex items-center justify-center p-6 sm:p-12">
          {/* Canvas Ambient Simulation */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

          {/* Central Constant OmniCore Orb */}
          <div className="relative z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-background border border-primary/50 shadow-2xl flex flex-col items-center justify-center text-center p-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-1 animate-spin-slow">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">
              OmniCore
            </span>
            <span className="text-[9px] font-mono text-primary">Constant</span>
          </div>

          {/* Morphing Peripheral Artifacts */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRealm.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 p-6 sm:p-10 pointer-events-none flex flex-col justify-between z-10"
            >
              {/* Top Details */}
              <div className="flex justify-between items-start">
                <div className="max-w-xs text-left">
                  <span className="text-xs font-mono font-bold uppercase" style={{ color: currentRealm.themeHue }}>
                    {currentRealm.label} Realm
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                    {currentRealm.tagline}
                  </h4>
                </div>
                <div className="text-right text-xs font-mono text-muted-foreground hidden sm:block">
                  Adaptive Morphing Engine
                </div>
              </div>

              {/* Bottom Peripheral Artifact Badges */}
              <div className="flex flex-wrap gap-2.5 justify-center sm:justify-end">
                {currentRealm.elements.map((item, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="px-3.5 py-1.5 rounded-full bg-background/90 border border-border/80 text-xs font-medium text-foreground backdrop-blur-md shadow-sm flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: currentRealm.themeHue }} />
                    <span>{item}</span>
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Note */}
        <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>One foundational AI core powering infinite specialized operational worlds.</span>
          <span className="text-primary flex items-center gap-1">
            Spatial Realm <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </section>
  );
};
