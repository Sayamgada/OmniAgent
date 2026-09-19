import React, { useEffect, useRef, useState, useCallback } from "react";

export interface DomainInfo {
  id: string;
  name: string;
  tagline: string;
  color: string;
  glowColor: string;
  agents: string[];
  tools: string[];
  metrics: string;
}

export const DOMAIN_DATA: Record<string, DomainInfo> = {
  education: {
    id: "education",
    name: "EDUCATION",
    tagline: "Adaptive Pedagogy & Research",
    color: "#38BDF8",
    glowColor: "rgba(56, 189, 248, 0.4)",
    agents: ["Study Planning", "Quiz Generation", "Summarization"],
    tools: ["Academic RAG", "Notion Sync", "Canvas LMS"],
    metrics: "99.4% Citation Accuracy",
  },
  finance: {
    id: "finance",
    name: "FINANCE",
    tagline: "Audit-Ready Fiscal Intelligence",
    color: "#2DD4BF",
    glowColor: "rgba(45, 212, 191, 0.4)",
    agents: ["Invoice Analysis", "Report Summarization", "Compliance Q&A"],
    tools: ["PDF Table OCR", "Variance Gate", "Slack Hooks"],
    metrics: "Zero-Shot Deterministic Audit",
  },
  corporate: {
    id: "corporate",
    name: "CORPORATE",
    tagline: "Enterprise Operations & Knowledge",
    color: "#00F2FE",
    glowColor: "rgba(0, 242, 254, 0.4)",
    agents: ["Email Ingestion", "Auto Scheduler", "Knowledge Graph"],
    tools: ["Gmail API", "Calendar Dispatcher", "ERP Connector"],
    metrics: "< 350ms Orchestration Time",
  },
};

interface Node3D {
  id: string;
  label: string;
  subLabel?: string;
  domain?: "education" | "finance" | "corporate" | "auxiliary";
  isCore?: boolean;
  isDomainHead?: boolean;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  connections: string[];
}

interface Particle {
  sourceId: string;
  targetId: string;
  t: number; // 0 to 1 progress
  speed: number;
  size: number;
  color: string;
  pulsePhase: number;
  domain?: string;
}

interface CinematicCanvasProps {
  activeDomain: string | null;
  onHoverDomain: (domain: string | null) => void;
  scrollProgress?: number;
  heroTheme?: "dark" | "light";
  className?: string;
}

// Smooth cubic easing helper
function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function lerpRgb(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

function rgbaStr(rgb: [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;
}

function getDomainRgb(domain: string | undefined, tp: number): [number, number, number] {
  if (domain === "education") {
    return lerpRgb([2, 132, 199], [56, 189, 248], tp);
  }
  if (domain === "finance") {
    return lerpRgb([13, 148, 136], [45, 212, 191], tp);
  }
  if (domain === "corporate") {
    return lerpRgb([3, 105, 161], [0, 242, 254], tp);
  }
  return lerpRgb([148, 163, 184], [100, 116, 139], tp);
}

interface CinematicCanvasProps {
  activeDomain: string | null;
  onHoverDomain: (domain: string | null) => void;
  scrollProgress?: number;
  heroTheme?: "dark" | "light";
  themeProgress?: number; // 0.0 = Light Site / Dark Hero, 1.0 = Dark Site / Light Hero
  className?: string;
}

export const CinematicAiNetworkCanvas: React.FC<CinematicCanvasProps> = ({
  activeDomain,
  onHoverDomain,
  scrollProgress = 0,
  heroTheme = "dark",
  themeProgress,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const scrollRef = useRef<number>(0);
  const themeRef = useRef<"dark" | "light">(heroTheme);
  const themeProgressRef = useRef<number>(
    themeProgress !== undefined ? (1 - themeProgress) : (heroTheme === "dark" ? 1.0 : 0.0)
  );

  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    themeRef.current = heroTheme;
  }, [heroTheme]);

  useEffect(() => {
    if (themeProgress !== undefined) {
      themeProgressRef.current = 1 - themeProgress;
    }
  }, [themeProgress]);

  // Network topology nodes
  const nodesRef = useRef<Node3D[]>([
    // ==========================================
    // 1. CENTRAL OMNIAGENT AI CORE
    // ==========================================
    {
      id: "core",
      label: "OMNI CORE",
      subLabel: "Orchestration Engine",
      isCore: true,
      x: 0,
      y: 40,
      z: 0,
      radius: 18,
      color: "#00F2FE",
      connections: [
        "edu_head",
        "corp_head",
        "fin_head",
        "aux_research",
        "aux_memory",
        "aux_analytics",
      ],
    },

    // ==========================================
    // 2. TOP ARCH (Framing Top Atmosphere)
    // ==========================================
    {
      id: "aux_research",
      label: "RESEARCH",
      domain: "auxiliary",
      x: -280,
      y: -140,
      z: -30,
      radius: 5,
      color: "#64748B",
      connections: ["edu_head"],
    },
    {
      id: "aux_memory",
      label: "MEMORY & RAG",
      domain: "auxiliary",
      x: 0,
      y: -170,
      z: -50,
      radius: 5,
      color: "#64748B",
      connections: [],
    },
    {
      id: "aux_analytics",
      label: "ANALYTICS",
      domain: "auxiliary",
      x: 280,
      y: -140,
      z: -30,
      radius: 5,
      color: "#64748B",
      connections: ["corp_head"],
    },

    // ==========================================
    // 3. EDUCATION WING (Wide Left of Central Core)
    // ==========================================
    {
      id: "edu_head",
      label: "EDUCATION",
      subLabel: "Pedagogy Hub",
      domain: "education",
      isDomainHead: true,
      x: -380,
      y: 0,
      z: 30,
      radius: 11,
      color: "#38BDF8",
      connections: ["edu_sub_1", "edu_sub_2", "edu_sub_3"],
    },
    {
      id: "edu_sub_1",
      label: "Study Planning",
      domain: "education",
      x: -520,
      y: -60,
      z: 60,
      radius: 6,
      color: "#38BDF8",
      connections: [],
    },
    {
      id: "edu_sub_2",
      label: "Quiz Generation",
      domain: "education",
      x: -470,
      y: 80,
      z: 70,
      radius: 6,
      color: "#38BDF8",
      connections: [],
    },
    {
      id: "edu_sub_3",
      label: "Summarization",
      domain: "education",
      x: -560,
      y: 20,
      z: 90,
      radius: 6,
      color: "#38BDF8",
      connections: [],
    },

    // ==========================================
    // 4. CORPORATE WING (Wide Right of Central Core)
    // ==========================================
    {
      id: "corp_head",
      label: "CORPORATE",
      subLabel: "Operations Hub",
      domain: "corporate",
      isDomainHead: true,
      x: 380,
      y: 0,
      z: 30,
      radius: 11,
      color: "#00F2FE",
      connections: ["corp_sub_1", "corp_sub_2", "corp_sub_3"],
    },
    {
      id: "corp_sub_1",
      label: "Email Ingestion",
      domain: "corporate",
      x: 520,
      y: -60,
      z: 60,
      radius: 6,
      color: "#00F2FE",
      connections: [],
    },
    {
      id: "corp_sub_2",
      label: "Auto Scheduler",
      domain: "corporate",
      x: 470,
      y: 80,
      z: 70,
      radius: 6,
      color: "#00F2FE",
      connections: [],
    },
    {
      id: "corp_sub_3",
      label: "Knowledge Graph",
      domain: "corporate",
      x: 560,
      y: 20,
      z: 90,
      radius: 6,
      color: "#00F2FE",
      connections: [],
    },

    // ==========================================
    // 5. FINANCE CLUSTER (Lower Depth Hub)
    // ==========================================
    {
      id: "fin_head",
      label: "FINANCE",
      subLabel: "Fiscal Hub",
      domain: "finance",
      isDomainHead: true,
      x: 0,
      y: 160,
      z: 40,
      radius: 11,
      color: "#2DD4BF",
      connections: ["fin_sub_1", "fin_sub_2", "fin_sub_3"],
    },
    {
      id: "fin_sub_1",
      label: "Invoice Analysis",
      domain: "finance",
      x: -140,
      y: 230,
      z: 70,
      radius: 6,
      color: "#2DD4BF",
      connections: [],
    },
    {
      id: "fin_sub_2",
      label: "Report Summarization",
      domain: "finance",
      x: 0,
      y: 260,
      z: 90,
      radius: 6,
      color: "#2DD4BF",
      connections: [],
    },
    {
      id: "fin_sub_3",
      label: "Compliance Q&A",
      domain: "finance",
      x: 140,
      y: 230,
      z: 70,
      radius: 6,
      color: "#2DD4BF",
      connections: [],
    },
  ]);

  // Particles state
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const nodes = nodesRef.current;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const newParticles: Particle[] = [];

    nodes.forEach((source) => {
      source.connections.forEach((targetId) => {
        const target = nodeMap.get(targetId);
        if (!target) return;

        const count = source.isCore ? 6 : 3;
        for (let i = 0; i < count; i++) {
          newParticles.push({
            sourceId: source.id,
            targetId: target.id,
            t: Math.random(),
            speed: 0.003 + Math.random() * 0.004,
            size: 1.5 + Math.random() * 2,
            color: target.color || source.color,
            pulsePhase: Math.random() * Math.PI * 2,
            domain: target.domain || source.domain,
          });
        }
      });
    });

    particlesRef.current = newParticles;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

    mouseRef.current.targetX = x * 22;
    mouseRef.current.targetY = y * 15;
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.targetX = 0;
    mouseRef.current.targetY = 0;
    onHoverDomain(null);
  }, [onHoverDomain]);

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const nodes = nodesRef.current;
      const width = rect.width;
      const height = rect.height;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1100;

      const centerX = width / 2;
      const centerY = height * 0.54;
      const focalLength = isMobile ? 360 : 500;
      const mobileScaleMultiplier = isMobile ? 0.6 : isTablet ? 0.82 : 1.0;

      const pX = mouseRef.current.x;
      const pY = mouseRef.current.y;

      let hovered: string | null = null;

      for (const node of nodes) {
        if (!node.domain || node.domain === "auxiliary") continue;

        const nodeX = node.x * mobileScaleMultiplier;
        const nodeY = node.y * mobileScaleMultiplier;
        const nodeZ = node.z;

        const scale = focalLength / (focalLength + nodeZ);
        const screenX = centerX + (nodeX + pX * (1 + nodeZ / 160)) * scale;
        const screenY = centerY + (nodeY + pY * (1 + nodeZ / 160)) * scale;
        const hitRadius = (node.radius + 18) * scale;

        const dist = Math.hypot(clickX - screenX, clickY - screenY);
        if (dist <= hitRadius) {
          hovered = node.domain;
          break;
        }
      }

      onHoverDomain(hovered);
    },
    [onHoverDomain]
  );

  // Main 60fps Canvas Render Loop with Core Radial Light Transformation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      timeRef.current += 0.016;
      const t = timeRef.current;

      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1100;
      const mobileScaleMultiplier = isMobile ? 0.6 : isTablet ? 0.82 : 1.0;

      // -------------------------------------------------------------
      // SCROLL STAGES (Strictly Contrastive, Continuous & Reversible)
      // 0.00 - 0.20: Hero normal dark state (network & typography active)
      // 0.20 - 0.45: Activation & Convergence (particles accelerate inward, network collapses into core)
      // 0.45 - 0.60: Core Ignition (core turns white-hot, intense bloom, telemetry dissolves)
      // 0.60 - 0.90: DEDICATED FULL-SCREEN RADIAL LIGHT EXPANSION (light radiates from core past all 4 corners)
      // 0.90 - 1.00: Light world pure luminous hold -> seamless entry to next section
      // -------------------------------------------------------------
      const scroll = Math.max(0, Math.min(1, scrollRef.current));

      // 1. Convergence factor (0 at scroll <= 0.20, 1 at scroll >= 0.50)
      const convergence = smoothstep(0.20, 0.50, scroll);

      // 2. Camera push-in toward core
      const cameraPushScale = 1 + smoothstep(0.22, 0.65, scroll) * 1.6;

      // 3. Core Ignition/Brightening Progress (starts at 0.45, peaks at 0.65)
      const coreIgnition = smoothstep(0.45, 0.65, scroll);
      const coreRadiusScale = 1 + Math.pow(coreIgnition, 2.2) * 2.8;

      // 4. Viewport Radial Light Expansion (starts at 0.60, completes full screen by 0.90)
      const radialExpandProgress = smoothstep(0.60, 0.90, scroll);

      // Center of projection
      const centerX = width / 2;
      const centerY = height * 0.52;
      const focalLength = (isMobile ? 360 : 500) * cameraPushScale;

      // Calculate projected 3D positions with convergence interpolation
      const nodes = nodesRef.current;
      const coreNode = nodes.find((n) => n.isCore)!;
      const projectedMap = new Map<
        string,
        { screenX: number; screenY: number; scale: number; node: Node3D; alpha: number }
      >();

      nodes.forEach((node) => {
        let nx = node.x * mobileScaleMultiplier;
        let ny = node.y * mobileScaleMultiplier;
        let nz = node.z;

        // Inward convergence toward core
        if (!node.isCore) {
          nx = nx * (1 - convergence) + (coreNode.x * mobileScaleMultiplier) * convergence;
          ny = ny * (1 - convergence) + (coreNode.y * mobileScaleMultiplier) * convergence;
          nz = nz * (1 - convergence) + coreNode.z * convergence;
        }

        const scale = focalLength / (focalLength + nz);
        const screenX = centerX + (nx + mouse.x * (1 - convergence * 0.8) * (1 + nz / 160)) * scale;
        const screenY = centerY + (ny + mouse.y * (1 - convergence * 0.8) * (1 + nz / 160)) * scale;

        // Peripheral nodes dissolve as they converge into the core
        const alpha = node.isCore ? 1.0 : Math.max(0, 1 - convergence * 1.5);

        projectedMap.set(node.id, { screenX, screenY, scale, node, alpha });
      });

      const coreProj = projectedMap.get("core");
      const cx = coreProj ? coreProj.screenX : centerX;
      const cy = coreProj ? coreProj.screenY : centerY;

      // Smooth ~300ms theme progress interpolation (0.0 = Light Hero, 1.0 = Dark Hero)
      const targetTp = themeRef.current === "dark" ? 1.0 : 0.0;
      themeProgressRef.current += (targetTp - themeProgressRef.current) * 0.085;
      const tp = themeProgressRef.current;
      const isDarkHero = tp > 0.5;

      // -------------------------------------------------------------
      // 1. DRAW ATMOSPHERIC AMBIENT GLOW (Originated FROM Core)
      // -------------------------------------------------------------
      if (coreProj && radialExpandProgress < 0.98) {
        const baseGlowRadius = (isMobile ? 220 : 380) * (1 + coreIgnition * 1.4);
        const glowAlpha = 0.22 + smoothstep(0.2, 0.55, scroll) * 0.35;

        const radialGlow = ctx.createRadialGradient(cx, cy, 4, cx, cy, baseGlowRadius);
        const stop0 = lerpRgb([2, 132, 199], [0, 242, 254], tp);
        const stop1 = lerpRgb([14, 165, 233], [14, 165, 233], tp);
        const stop2 = lerpRgb([13, 148, 136], [45, 212, 191], tp);
        const stop3 = lerpRgb([248, 250, 252], [6, 9, 15], tp);

        const a0 = (0.55 * (1 - tp) + 1.0 * tp) * glowAlpha;
        const a1 = (0.35 * (1 - tp) + 0.6 * tp) * glowAlpha;
        const a2 = (0.15 * (1 - tp) + 0.2 * tp) * glowAlpha;

        radialGlow.addColorStop(0, rgbaStr(stop0, a0));
        radialGlow.addColorStop(0.35, rgbaStr(stop1, a1));
        radialGlow.addColorStop(0.7, rgbaStr(stop2, a2));
        radialGlow.addColorStop(1, rgbaStr(stop3, 0));

        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, baseGlowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Concentric computational energy rings
        if (convergence < 0.75) {
          const ringAlpha = (1 - convergence) * (0.12 * (1 - tp) + 0.06 * tp);
          const ringColor = lerpRgb([2, 132, 199], [0, 242, 254], tp);
          const ringStroke = rgbaStr(ringColor, ringAlpha);
          ctx.save();
          for (let r = 90; r <= 460; r += 95) {
            ctx.beginPath();
            ctx.ellipse(
              cx,
              cy + (r * 0.16),
              r * mobileScaleMultiplier * (1 - convergence * 0.4),
              r * 0.38 * mobileScaleMultiplier * (1 - convergence * 0.4),
              0,
              0,
              Math.PI * 2
            );
            ctx.strokeStyle = ringStroke;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 14]);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // -------------------------------------------------------------
      // 2. DRAW CONNECTING CIRCUIT / NEURAL PATHS
      // -------------------------------------------------------------
      if (convergence < 0.92) {
        nodes.forEach((source) => {
          const sProj = projectedMap.get(source.id);
          if (!sProj || sProj.alpha <= 0.01) return;

          source.connections.forEach((targetId) => {
            const tProj = projectedMap.get(targetId);
            if (!tProj || tProj.alpha <= 0.01) return;

            const isBranchActive =
              activeDomain &&
              (tProj.node.domain === activeDomain || source.domain === activeDomain);

            const pathAlpha = Math.min(sProj.alpha, tProj.alpha);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(sProj.screenX, sProj.screenY);

            const midX = (sProj.screenX + tProj.screenX) / 2;
            const midY = (sProj.screenY + tProj.screenY) / 2 - 8 * (1 - convergence);
            ctx.quadraticCurveTo(midX, midY, tProj.screenX, tProj.screenY);

            const domainRgb = getDomainRgb(tProj.node.domain, tp);
            const nodeBaseColor = rgbaStr(domainRgb, 1.0);

            if (isBranchActive) {
              ctx.strokeStyle = nodeBaseColor;
              ctx.lineWidth = 2.4;
              ctx.shadowColor = nodeBaseColor;
              ctx.shadowBlur = 6 * (1 - tp) + 12 * tp;
            } else {
              const isAux = source.isCore && tProj.node.domain === "auxiliary";
              const wireRgb = isAux
                ? lerpRgb([148, 163, 184], [100, 116, 139], tp)
                : lerpRgb([15, 23, 42], [56, 189, 248], tp);
              const wireAlpha = isAux
                ? (0.28 * (1 - tp) + 0.16 * tp) * pathAlpha
                : (0.20 * (1 - tp) + 0.22 * tp) * pathAlpha;
              ctx.strokeStyle = rgbaStr(wireRgb, wireAlpha);
              ctx.lineWidth = 1.2;
              ctx.shadowBlur = 0;
            }

            ctx.stroke();
            ctx.restore();
          });
        });
      }

      // -------------------------------------------------------------
      // 3. DRAW TRAVELLING GLOWING PARTICLES
      // -------------------------------------------------------------
      if (convergence < 0.88) {
        const particles = particlesRef.current;
        particles.forEach((p) => {
          const sProj = projectedMap.get(p.sourceId);
          const tProj = projectedMap.get(p.targetId);
          if (!sProj || !tProj) return;

          const isBranchActive = activeDomain && p.domain === activeDomain;

          // Flow direction: outward normally, accelerates inward during convergence
          const speedMultiplier = 1 + scroll * 3.5;
          const currentSpeed = isBranchActive ? p.speed * 2.2 : p.speed * speedMultiplier;

          if (scroll > 0.20) {
            p.t -= currentSpeed;
            if (p.t < 0) p.t = 1;
          } else {
            p.t += currentSpeed;
            if (p.t > 1) p.t = 0;
          }

          const midX = (sProj.screenX + tProj.screenX) / 2;
          const midY = (sProj.screenY + tProj.screenY) / 2 - 8 * (1 - convergence);

          const invT = 1 - p.t;
          const px =
            invT * invT * sProj.screenX +
            2 * invT * p.t * midX +
            p.t * p.t * tProj.screenX;
          const py =
            invT * invT * sProj.screenY +
            2 * invT * p.t * midY +
            p.t * p.t * tProj.screenY;

          const scale = (sProj.scale + tProj.scale) / 2;
          const radius = p.size * scale * (isBranchActive ? 1.4 : 1.0);
          const pAlpha = Math.min(sProj.alpha, tProj.alpha) * (1 - smoothstep(0.50, 0.75, scroll));

          if (pAlpha <= 0.01) return;

          const particleRgb = getDomainRgb(p.domain, tp);
          const particleColor = rgbaStr(particleRgb, 1.0);

          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, Math.max(radius, 1), 0, Math.PI * 2);

          ctx.fillStyle = particleColor;
          ctx.globalAlpha = pAlpha;
          ctx.shadowColor = particleColor;
          ctx.shadowBlur = 4 * (1 - tp) + 8 * tp;
          ctx.fill();

          ctx.restore();
        });
      }

      // -------------------------------------------------------------
      // 4. DRAW NODES (Domain Heads & Sub-Nodes)
      // -------------------------------------------------------------
      nodes.forEach((node) => {
        if (node.isCore) return;

        const proj = projectedMap.get(node.id);
        if (!proj || proj.alpha <= 0.01) return;

        const { screenX, screenY, scale, alpha } = proj;
        const isHovered = activeDomain && node.domain === activeDomain;

        const nodeRgb = getDomainRgb(node.domain, tp);
        const nodeColor = rgbaStr(nodeRgb, 1.0);

        ctx.save();
        ctx.globalAlpha = alpha;

        if (node.isDomainHead) {
          const nodeRadius = node.radius * scale * (isHovered ? 1.35 : 1.0);
          const domainColor = nodeColor;

          if (isHovered) {
            const glowRing = (Math.sin(t * 4) * 0.15 + 1) * nodeRadius * 1.8;
            ctx.beginPath();
            ctx.arc(screenX, screenY, glowRing, 0, Math.PI * 2);
            ctx.strokeStyle = domainColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          const headFillRgb = isHovered
            ? nodeRgb
            : lerpRgb([255, 255, 255], [10, 16, 29], tp);

          ctx.beginPath();
          ctx.arc(screenX, screenY, nodeRadius, 0, Math.PI * 2);
          ctx.fillStyle = rgbaStr(headFillRgb, 1.0);
          ctx.strokeStyle = domainColor;
          ctx.lineWidth = isHovered ? 2.5 : 1.5;
          ctx.shadowColor = domainColor;
          ctx.shadowBlur = (isHovered ? 10 : 4) * (1 - tp) + (isHovered ? 18 : 8) * tp;
          ctx.fill();
          ctx.stroke();

          const centerDiscRgb = isHovered
            ? [255, 255, 255] as [number, number, number]
            : nodeRgb;
          ctx.beginPath();
          ctx.arc(screenX, screenY, nodeRadius * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = rgbaStr(centerDiscRgb, 1.0);
          ctx.fill();

          if (alpha > 0.5) {
            ctx.font = `700 ${Math.max(11 * scale, 10)}px system-ui, -apple-system, sans-serif`;
            const textRgb = isHovered
              ? lerpRgb([15, 23, 42], [255, 255, 255], tp)
              : lerpRgb([15, 23, 42], [226, 232, 240], tp);
            ctx.fillStyle = rgbaStr(textRgb, 1.0);
            ctx.textAlign = "center";
            const textShadowRgb = lerpRgb([255, 255, 255], [0, 0, 0], tp);
            ctx.shadowColor = rgbaStr(textShadowRgb, 0.9);
            ctx.shadowBlur = 5;
            ctx.fillText(node.label, screenX, screenY - nodeRadius - 8 * scale);
          }
        } else {
          const subRadius = node.radius * scale * (isHovered ? 1.25 : 1.0);
          const subFillRgb = isHovered
            ? nodeRgb
            : lerpRgb([248, 250, 252], [13, 21, 38], tp);
          const subStrokeRgb = isHovered
            ? lerpRgb([15, 23, 42], [255, 255, 255], tp)
            : nodeRgb;

          ctx.beginPath();
          ctx.arc(screenX, screenY, subRadius, 0, Math.PI * 2);
          ctx.fillStyle = rgbaStr(subFillRgb, 1.0);
          ctx.strokeStyle = rgbaStr(subStrokeRgb, 1.0);
          ctx.lineWidth = isHovered ? 1.8 : 1.0;
          ctx.shadowColor = nodeColor;
          ctx.shadowBlur = 3 * (1 - tp) + (isHovered ? 12 : 4) * tp;
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      });

      // -------------------------------------------------------------
      // 5. DRAW EXPANDING OMNIAGENT AI CORE
      // -------------------------------------------------------------
      let currentCoreRadius = 20;
      if (coreProj) {
        ctx.save();
        const pulse = Math.sin(t * 2.2) * 0.08 + 1;
        currentCoreRadius = coreProj.node.radius * coreProj.scale * pulse * coreRadiusScale;

        // Telemetry rings fade out as core expands
        if (coreIgnition < 0.65) {
          const ringAlpha = (1 - coreIgnition * 1.5) * (0.65 * (1 - tp) + 0.5 * tp);
          const ringRgb1 = lerpRgb([2, 132, 199], [0, 242, 254], tp);
          const ringRgb2 = lerpRgb([13, 148, 136], [45, 212, 191], tp);
          const ringColor1 = rgbaStr(ringRgb1, ringAlpha);
          const ringColor2 = rgbaStr(ringRgb2, ringAlpha * 0.7);

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t * 0.4);
          ctx.beginPath();
          ctx.arc(0, 0, currentCoreRadius * 2.2, 0, Math.PI * 2);
          ctx.strokeStyle = ringColor1;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([6, 8, 2, 8]);
          ctx.stroke();

          ctx.rotate(-t * 0.8);
          ctx.beginPath();
          ctx.arc(0, 0, currentCoreRadius * 2.9, 0, Math.PI * 2);
          ctx.strokeStyle = ringColor2;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 14]);
          ctx.stroke();
          ctx.restore();
        }

        // Core radiant sphere
        const coreGrad = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          currentCoreRadius * (1.8 + coreIgnition * 2.5)
        );

        const c0 = lerpRgb([3, 105, 161], [255, 255, 255], tp);
        const c1 = lerpRgb([2, 132, 199], [224, 242, 254], tp);
        const c2 = lerpRgb([56, 189, 248], [0, 242, 254], tp);
        const c3 = lerpRgb([56, 189, 248], [14, 165, 233], tp);

        const coreAlpha = (0.8 - coreIgnition * 0.2) * (1 - tp) + (0.9 - coreIgnition * 0.2) * tp;

        coreGrad.addColorStop(0, rgbaStr(c0, 1.0));
        coreGrad.addColorStop(0.20, rgbaStr(c1, 1.0));
        coreGrad.addColorStop(0.42, rgbaStr(c2, 1.0));
        coreGrad.addColorStop(0.72, rgbaStr(c3, coreAlpha));
        coreGrad.addColorStop(1, rgbaStr(c3, 0));

        ctx.beginPath();
        ctx.arc(cx, cy, currentCoreRadius * (1.8 + coreIgnition * 2.5), 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        const shadowRgb = lerpRgb([2, 132, 199], [0, 242, 254], tp);
        ctx.shadowColor = rgbaStr(shadowRgb, 1.0);
        ctx.shadowBlur = 28 + coreIgnition * 50;
        ctx.fill();

        // Central white-hot / dark-hot emitter
        const emitterRgb = lerpRgb([15, 23, 42], [255, 255, 255], tp);
        const emitterShadowRgb = lerpRgb([2, 132, 199], [255, 255, 255], tp);
        ctx.beginPath();
        ctx.arc(cx, cy, currentCoreRadius * (0.45 + coreIgnition * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = rgbaStr(emitterRgb, 1.0);
        ctx.shadowColor = rgbaStr(emitterShadowRgb, 1.0);
        ctx.shadowBlur = 14 + coreIgnition * 35;
        ctx.fill();

        // Core Label (fades out as convergence begins)
        if (convergence < 0.25) {
          ctx.font = `700 ${Math.max(10 * coreProj.scale, 9)}px 'JetBrains Mono', monospace`;
          const coreLabelRgb = lerpRgb([15, 23, 42], [224, 242, 254], tp);
          ctx.fillStyle = rgbaStr(coreLabelRgb, 1.0);
          ctx.textAlign = "center";
          const coreLabelShadowRgb = lerpRgb([255, 255, 255], [0, 0, 0], tp);
          ctx.shadowColor = rgbaStr(coreLabelShadowRgb, 0.9);
          ctx.shadowBlur = 5;
          ctx.fillText("OMNIAGENT AI CORE", cx, cy + currentCoreRadius * 2.6);
        }

        ctx.restore();
      }

      // -------------------------------------------------------------
      // 6. VISUAL ENVIRONMENT TRANSFORMATION: CONTINUOUS RADIAL EXPANSION
      // Originates strictly from the central AI Core (cx, cy)
      // Continues expanding across and PAST all 4 viewport corners
      // -------------------------------------------------------------
      if (radialExpandProgress > 0.001) {
        ctx.save();

        // Exact maximum distance to the farthest viewport corner from the core origin
        const maxCornerDistance = Math.hypot(
          Math.max(cx, width - cx),
          Math.max(cy, height - cy)
        );

        // Calculate continuous expanding radii
        const outerBloomRadius =
          currentCoreRadius +
          Math.pow(radialExpandProgress, 1.4) * (maxCornerDistance * 2.2);

        const whiteCoreProgress = smoothstep(0.08, 0.90, radialExpandProgress);
        const solidCoreRadius = Math.pow(whiteCoreProgress, 1.8) * (maxCornerDistance * 1.35);

        if (solidCoreRadius < outerBloomRadius) {
          const radialGrad = ctx.createRadialGradient(
            cx,
            cy,
            solidCoreRadius,
            cx,
            cy,
            outerBloomRadius
          );

          const stop0 = lerpRgb([6, 9, 15], [255, 255, 255], tp);
          const stop1 = lerpRgb([13, 19, 31], [240, 249, 255], tp);
          const stop2 = lerpRgb([15, 23, 42], [186, 230, 253], tp);
          const stop3 = lerpRgb([14, 165, 233], [56, 189, 248], tp);
          const stop4 = lerpRgb([248, 250, 252], [6, 9, 15], tp);

          const a0 = (0.9 * (1 - tp) + 0.85 * tp) + radialExpandProgress * (0.1 * (1 - tp) + 0.15 * tp);
          const a1 = (0.85 * (1 - tp) + 0.75 * tp) + radialExpandProgress * (0.15 * (1 - tp) + 0.25 * tp);
          const a2 = (0.75 * (1 - tp) + 0.55 * tp) + radialExpandProgress * (0.25 * (1 - tp) + 0.4 * tp);
          const a3 = (0.45 * (1 - tp) + 0.35 * tp) + radialExpandProgress * (0.4 * (1 - tp) + 0.5 * tp);

          radialGrad.addColorStop(0, rgbaStr(stop0, Math.min(1.0, a0)));
          radialGrad.addColorStop(0.25, rgbaStr(stop1, Math.min(1.0, a1)));
          radialGrad.addColorStop(0.55, rgbaStr(stop2, Math.min(0.95, a2)));
          radialGrad.addColorStop(0.80, rgbaStr(stop3, Math.min(0.85, a3)));
          radialGrad.addColorStop(1.0, rgbaStr(stop4, 0));

          ctx.fillStyle = radialGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, outerBloomRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        const solidColor = lerpRgb([6, 9, 15], [255, 255, 255], tp);

        // Fill inner solid disc
        if (solidCoreRadius > 0) {
          ctx.beginPath();
          ctx.arc(cx, cy, solidCoreRadius, 0, Math.PI * 2);
          ctx.fillStyle = rgbaStr(solidColor, 1.0);
          ctx.fill();
        }

        // Luminous hold for final stage (0.90 - 1.00)
        if (radialExpandProgress >= 0.99 || solidCoreRadius >= maxCornerDistance) {
          ctx.fillStyle = rgbaStr(solidColor, 1.0);
          ctx.fillRect(0, 0, width, height);
        }

        ctx.restore();
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [activeDomain]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-full select-none cursor-crosshair overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleCanvasMouseMove}
        className="absolute inset-0 w-full h-full block"
      />
    </div>
  );
};
