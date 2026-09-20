import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Landmark,
  Building2,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileText,
  UserCheck,
  TrendingUp,
  Inbox,
  Send,
  Calendar
} from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

export type DomainType = "education" | "finance" | "business";

interface StepNode {
  number: string;
  label: string;
  detail: string;
  icon: React.ElementType;
}

interface DomainStory {
  id: DomainType;
  label: string;
  icon: React.ElementType;
  tagline: string;
  accentColor: string;
  secondaryColor: string;
  steps: StepNode[];
  previewOutput: {
    title: string;
    badge: string;
    details: string[];
  };
}

const DOMAIN_STORIES: DomainStory[] = [
  {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    tagline: "Personalized learning, without the manual work.",
    accentColor: "#38BDF8", // Sky Blue
    secondaryColor: "#818CF8", // Indigo
    steps: [
      { number: "01", label: "Student Need", detail: "Course syllabus & quiz diagnostics", icon: UserCheck },
      { number: "02", label: "Learning Path", detail: "Tailored 12-week curriculum synthesized", icon: BookOpen },
      { number: "03", label: "Adaptive Quizzes", detail: "Diagnostic practice questions generated", icon: Sparkles },
      { number: "04", label: "Student Mastery", detail: "Real-time progress synced to school LMS", icon: CheckCircle2 },
    ],
    previewOutput: {
      title: "Adaptive Physics Track v2",
      badge: "Completed in 3s",
      details: ["12 Weekly Lesson Modules", "3 Personalized Quizzes", "Canvas LMS Synced"],
    },
  },
  {
    id: "finance",
    label: "Finance",
    icon: Landmark,
    tagline: "Turn financial tasks into coordinated, verified reports.",
    accentColor: "#10B981", // Emerald Green
    secondaryColor: "#F59E0B", // Amber
    steps: [
      { number: "01", label: "Raw Transactions", detail: "Bank feeds, receipts & monthly invoices", icon: FileText },
      { number: "02", label: "Smart Analysis", detail: "Ledgers reconciled against budget plans", icon: TrendingUp },
      { number: "03", label: "Anomaly Check", detail: "Unusual variances flagged automatically", icon: Sparkles },
      { number: "04", label: "Executive Report", detail: "Clean summary ready for leadership", icon: CheckCircle2 },
    ],
    previewOutput: {
      title: "Q3 Fiscal Reconciliation",
      badge: "Zero Discrepancies",
      details: ["1,420 Invoices Verified", "3 Anomaly Alerts Resolved", "Summary PDF Dispatched"],
    },
  },
  {
    id: "business",
    label: "Business",
    icon: Building2,
    tagline: "Turn customer requests into automated action.",
    accentColor: "#06B6D4", // Cyan
    secondaryColor: "#3B82F6", // Blue
    steps: [
      { number: "01", label: "Customer Inquiries", detail: "Incoming tickets, emails & chat requests", icon: Inbox },
      { number: "02", label: "Priority Triage", detail: "Categorized by urgency & client tier", icon: Sparkles },
      { number: "03", label: "Action Drafts", detail: "Contextual responses & tasks prepared", icon: Send },
      { number: "04", label: "Instant Resolution", detail: "Tickets resolved & CRM updated live", icon: CheckCircle2 },
    ],
    previewOutput: {
      title: "VIP Account Workflow",
      badge: "Auto-Resolved",
      details: ["Priority Tier Assigned", "Verified Response Sent", "Salesforce Updated"],
    },
  },
];

export const MorphingDomainVisual: React.FC = () => {
  const [activeDomainId, setActiveDomainId] = useState<DomainType>("education");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  const current = DOMAIN_STORIES.find((d) => d.id === activeDomainId) || DOMAIN_STORIES[0];

  // Ambient Canvas Fluid Stream
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 140);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 140;
    };

    window.addEventListener("resize", handleResize);

    let time = 0;
    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * width,
      y: height * 0.5 + (Math.random() - 0.5) * 40,
      vx: 1.2 + Math.random() * 1.5,
      size: 1.5 + Math.random() * 2,
    }));

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Draw subtle connective line between the 4 step nodes
      const lineGrad = ctx.createLinearGradient(40, height * 0.5, width - 40, height * 0.5);
      lineGrad.addColorStop(0, isDark ? "rgba(56, 189, 248, 0.15)" : "rgba(2, 132, 199, 0.15)");
      lineGrad.addColorStop(0.5, current.accentColor + "40");
      lineGrad.addColorStop(1, isDark ? "rgba(52, 211, 153, 0.3)" : "rgba(5, 150, 105, 0.3)");

      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, height * 0.5);
      ctx.lineTo(width - 40, height * 0.5);
      ctx.stroke();

      // Draw streaming light pulses
      particles.forEach((p) => {
        p.x += p.vx;
        if (p.x > width - 40) {
          p.x = 40;
        }

        ctx.fillStyle = current.accentColor;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(p.x, height * 0.5, p.size, 0, Math.PI * 2);
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
  }, [current, isDark]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* 1. Minimal Domain Selector Pills (Top) */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1.5 rounded-full bg-card/90 border border-border/80 shadow-md backdrop-blur-xl">
          {DOMAIN_STORIES.map((story) => {
            const Icon = story.icon;
            const isActive = activeDomainId === story.id;
            return (
              <button
                key={story.id}
                onClick={() => setActiveDomainId(story.id)}
                className={`relative flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? "text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="domainActivePill"
                    className="absolute inset-0 bg-primary rounded-full"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{story.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Headline Tagline for Active Domain */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="text-center mb-10"
        >
          <div className="text-xs font-mono uppercase tracking-widest text-primary font-semibold mb-1">
            {current.label.toUpperCase()} WORKFLOW
          </div>
          <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {current.tagline}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* 3. Living Morphing Visual Workflow Environment */}
      <div className="relative rounded-3xl border border-border/80 bg-card/75 backdrop-blur-xl shadow-2xl p-6 sm:p-10 lg:p-12 overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div
          className="absolute -top-10 -right-10 w-80 h-80 rounded-full blur-[120px] pointer-events-none transition-colors duration-500 opacity-20"
          style={{ backgroundColor: current.accentColor }}
        />

        {/* 4-Step Animated Progressive Journey */}
        <div className="relative mb-12">
          {/* Background Connector Canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 relative z-10">
            <AnimatePresence mode="wait">
              {current.steps.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <motion.div
                    key={`${current.id}-${step.number}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3, delay: idx * 0.08 }}
                    className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-background/85 border border-border/70 backdrop-blur-md shadow-sm hover:border-primary/50 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                          style={{
                            backgroundColor: `${current.accentColor}18`,
                            color: current.accentColor,
                          }}
                        >
                          <StepIcon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                          STEP {step.number}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground mb-1 tracking-tight">
                        {step.label}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {step.detail}
                      </p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-border/40 flex items-center text-[10px] font-mono text-muted-foreground gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Automated</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* 4. Tangible Artifact Summary Bar */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl bg-background/90 border border-border/80 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${current.accentColor}20`,
                  color: current.accentColor,
                }}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-foreground">{current.previewOutput.title}</div>
                <div className="text-xs text-muted-foreground">{current.previewOutput.badge}</div>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end w-full sm:w-auto">
              {current.previewOutput.details.map((detail, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-muted/60 text-foreground/80 text-xs font-medium border border-border/50"
                >
                  {detail}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>One continuous intelligence, configured for any domain.</span>
          <span className="font-mono text-primary flex items-center gap-1 font-medium">
            Seamless Versatility <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
