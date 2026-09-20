import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Layers, FileText, Calendar, Send, CheckCircle2, MessageSquare } from "lucide-react";
import { useSiteTheme } from "../../../context/ThemeContext";

export const ExperimentalSection03: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const { siteTheme } = useSiteTheme();
  const isDark = siteTheme === "dark";

  const surfaces = [
    {
      id: "input",
      title: "Incoming Request",
      tag: "01. Intake",
      desc: "Client email: 'Need full Q3 summary by 4 PM'",
      icon: MessageSquare,
      color: "#38BDF8",
      x: "15%",
      y: "25%",
    },
    {
      id: "doc",
      title: "Document Analyzer",
      tag: "02. Analysis",
      desc: "Parsing 14 financial tables and audit notes",
      icon: FileText,
      color: "#818CF8",
      x: "50%",
      y: "18%",
    },
    {
      id: "schedule",
      title: "Calendar Sync",
      tag: "03. Logistics",
      desc: "Review blocked on exec calendar with attachments",
      icon: Calendar,
      color: "#34D399",
      x: "30%",
      y: "70%",
    },
    {
      id: "dispatch",
      title: "Verified Delivery",
      tag: "04. Output",
      desc: "Executive memo sent & CRM deal status updated",
      icon: CheckCircle2,
      color: "#06B6D4",
      x: "72%",
      y: "65%",
    },
  ];

  return (
    <section
      id="experiment-03"
      className="relative min-h-screen py-32 px-4 sm:px-6 lg:px-8 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Dev Label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-widest backdrop-blur-md shadow-xs">
          <span>EXPERIMENT 03 — THE CONNECTED WORKSPACE</span>
        </div>
      </div>

      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[950px] h-[550px] bg-primary/5 rounded-full blur-[190px] pointer-events-none" />

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
            Everything connected.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
              Nothing to manage.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A spatial environment where incoming requests, documents, and calendars interact autonomously.
          </p>
        </motion.div>

        {/* Spatial Floating Workspace Stage */}
        <div className="relative h-[480px] sm:h-[540px] rounded-3xl border border-border/80 bg-card/60 backdrop-blur-2xl shadow-2xl overflow-hidden p-6 sm:p-10 flex items-center justify-center">
          {/* Subtle Perspective Grid */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(56, 189, 248, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.4) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              transform: "perspective(600px) rotateX(25deg)",
            }}
          />

          {/* Connective Laser SVG Beams between spatial nodes */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <linearGradient id="laserGrad1" x1="15%" y1="25%" x2="50%" y2="18%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#818CF8" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="laserGrad2" x1="50%" y1="18%" x2="30%" y2="70%">
                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#34D399" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="laserGrad3" x1="30%" y1="70%" x2="72%" y2="65%">
                <stop offset="0%" stopColor="#34D399" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            <line x1="25%" y1="30%" x2="50%" y2="25%" stroke="url(#laserGrad1)" strokeWidth="2" strokeDasharray="6 6" />
            <line x1="50%" y1="28%" x2="38%" y2="65%" stroke="url(#laserGrad2)" strokeWidth="2" strokeDasharray="6 6" />
            <line x1="42%" y1="72%" x2="68%" y2="68%" stroke="url(#laserGrad3)" strokeWidth="2" strokeDasharray="6 6" />
          </svg>

          {/* Floating Translucent Spatial Surfaces */}
          <div className="absolute inset-0 p-6 sm:p-10 pointer-events-none">
            {surfaces.map((surf, i) => {
              const Icon = surf.icon;
              return (
                <motion.div
                  key={surf.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  animate={{
                    y: [0, -8, 0],
                  }}
                  transition={{
                    y: { duration: 4 + i * 0.8, repeat: Infinity, ease: "easeInOut" },
                    opacity: { duration: 0.5, delay: i * 0.15 },
                  }}
                  style={{ left: surf.x, top: surf.y }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-10 w-56 sm:w-64"
                >
                  <div className="p-4 rounded-2xl bg-background/85 border border-border/80 shadow-2xl backdrop-blur-xl hover:border-primary/60 transition-all group hover:scale-105">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                        {surf.tag}
                      </span>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                        style={{ backgroundColor: `${surf.color}20`, color: surf.color }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground mb-1">
                      {surf.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {surf.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Central Spatial Pulse Anchor */}
          <div className="relative z-0 pointer-events-none flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center animate-pulse">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <span className="mt-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              Autonomous Mesh
            </span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Spatial coordination replaces isolated tabs and dashboard friction.</span>
          <span className="text-primary flex items-center gap-1">
            Living Workspace <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </section>
  );
};
