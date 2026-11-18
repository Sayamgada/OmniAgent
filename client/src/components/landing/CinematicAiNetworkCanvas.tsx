import React, { useEffect, useRef, useCallback } from "react";
import type { MotionValue } from "framer-motion";
import { useSiteTheme } from "../../context/ThemeContext";

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
  scrollMotionValue?: MotionValue<number>;
  heroTheme?: "dark" | "light";
  themeProgress?: number;
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

export const CinematicAiNetworkCanvas: React.FC<CinematicCanvasProps> = ({
  activeDomain,
  onHoverDomain,
  scrollProgress = 0,
  scrollMotionValue,
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
  const isVisibleRef = useRef<boolean>(true);

  const { variant } = useSiteTheme();
  const variantRef = useRef(variant);
  variantRef.current = variant;

  const themeProgressRef = useRef<number>(
    themeProgress !== undefined ? themeProgress : (heroTheme === "dark" ? 1.0 : 0.0)
  );

  useEffect(() => {
    if (scrollMotionValue) {
      scrollRef.current = scrollMotionValue.get();
      return scrollMotionValue.on("change", (latest) => {
        scrollRef.current = latest;
      });
    }
  }, [scrollMotionValue]);

  useEffect(() => {
    if (scrollProgress !== undefined && !scrollMotionValue) {
      scrollRef.current = scrollProgress;
    }
  }, [scrollProgress, scrollMotionValue]);

  useEffect(() => {
    themeRef.current = heroTheme;
  }, [heroTheme]);

  useEffect(() => {
    if (themeProgress !== undefined) {
      themeProgressRef.current = themeProgress;
    }
  }, [themeProgress]);

  // Performance optimization: pause render loop when canvas container is off-screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.02 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Network topology nodes
  const nodesRef = useRef<Node3D[]>([
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
      radius: 5.5,
      color: "#38BDF8",
      connections: [],
    },
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
      label: "Email Triage",
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
      label: "Auto Scheduling",
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
      label: "Knowledge Sync",
      domain: "corporate",
      x: 560,
      y: 20,
      z: 90,
      radius: 5.5,
      color: "#00F2FE",
      connections: [],
    },
    {
      id: "fin_head",
      label: "FINANCE",
      subLabel: "Audit & Ledger",
      domain: "finance",
      isDomainHead: true,
      x: 0,
      y: 180,
      z: 40,
      radius: 11,
      color: "#2DD4BF",
      connections: ["fin_sub_1", "fin_sub_2"],
    },
    {
      id: "fin_sub_1",
      label: "Invoice Parser",
      domain: "finance",
      x: -160,
      y: 270,
      z: 80,
      radius: 6,
      color: "#2DD4BF",
      connections: [],
    },
    {
      id: "fin_sub_2",
      label: "Variance Gate",
      domain: "finance",
      x: 160,
      y: 270,
      z: 80,
      radius: 6,
      color: "#2DD4BF",
      connections: [],
    },
  ]);

  // Dynamic particle streams
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const particles: Particle[] = [];
    const nodes = nodesRef.current;

    nodes.forEach((source) => {
      source.connections.forEach((targetId) => {
        const target = nodes.find((n) => n.id === targetId);
        if (!target) return;

        const count = source.isCore ? 5 : 3;
        for (let i = 0; i < count; i++) {
          particles.push({
            sourceId: source.id,
            targetId: target.id,
            t: Math.random(),
            speed: 0.003 + Math.random() * 0.0045,
            size: 1.8 + Math.random() * 1.6,
            color: target.color || source.color,
            pulsePhase: Math.random() * Math.PI * 2,
            domain: target.domain || source.domain,
          });
        }
      });
    });

    particlesRef.current = particles;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    mouseRef.current.targetX = x * 24;
    mouseRef.current.targetY = y * 18;
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
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const nodes = nodesRef.current;
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerX = width / 2;
      const centerY = height * 0.52;
      const focalLength = 500;

      let hovered: string | null = null;
      for (const node of nodes) {
        if (!node.isDomainHead && !node.isCore) continue;
        const scale = focalLength / (focalLength + node.z);
        const sx = centerX + (node.x + mouseRef.current.x) * scale;
        const sy = centerY + (node.y + mouseRef.current.y) * scale;
        const hitRadius = (node.radius + 16) * scale;

        const dist = Math.hypot(mouseX - sx, mouseY - sy);
        if (dist < hitRadius) {
          hovered = node.domain || null;
          break;
        }
      }

      onHoverDomain(hovered);
    },
    [onHoverDomain]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let isRunning = true;

    const resize = () => {
      if (!canvas || !canvas.parentElement) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      if (!isRunning) return;

      if (!isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const activeVar = variantRef.current;
      const darkPal = activeVar.canvasPalette.dark;
      const lightPal = activeVar.canvasPalette.light;

      const getDomainRgbHelper = (domain: string | undefined, tpVal: number): [number, number, number] => {
        if (domain === "education") {
          return lerpRgb(lightPal.education, darkPal.education, tpVal);
        }
        if (domain === "finance") {
          return lerpRgb(lightPal.finance, darkPal.finance, tpVal);
        }
        if (domain === "corporate") {
          return lerpRgb(lightPal.corporate, darkPal.corporate, tpVal);
        }
        return lerpRgb(lightPal.education, darkPal.secondary as unknown as [number, number, number] || [120, 140, 160], tpVal);
      };

      timeRef.current += 0.016;
      const t = timeRef.current;

      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const isMobile = width < 768;
      const mobileScaleMultiplier = isMobile ? 0.65 : 1.0;

      ctx.clearRect(0, 0, width, height);

      const scroll = Math.max(0, Math.min(1, scrollRef.current));
      const convergence = smoothstep(0.22, 0.60, scroll);
      const cameraPushScale = 1 + smoothstep(0.25, 0.70, scroll) * 0.35;
      const coreIgnition = smoothstep(0.38, 0.72, scroll);
      const coreRadiusScale = 1 + coreIgnition * 0.65;
      const radialExpandProgress = smoothstep(0.55, 0.95, scroll);

      // Central core orb and halo fade completely to 0 between scroll 0.70 and 0.88
      // so zero residual light orb floats into following landing sections
      const orbFadeAlpha = Math.max(0, 1 - smoothstep(0.70, 0.88, scroll));

      const centerX = width / 2;
      const centerY = height * 0.52;
      const focalLength = (isMobile ? 360 : 500) * cameraPushScale;

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

        if (!node.isCore) {
          nx = nx * (1 - convergence) + (coreNode.x * mobileScaleMultiplier) * convergence;
          ny = ny * (1 - convergence) + (coreNode.y * mobileScaleMultiplier) * convergence;
          nz = nz * (1 - convergence) + coreNode.z * convergence;
        }

        const scale = focalLength / (focalLength + nz);
        const screenX = centerX + (nx + mouse.x * (1 - convergence * 0.8) * (1 + nz / 160)) * scale;
        const screenY = centerY + (ny + mouse.y * (1 - convergence * 0.8) * (1 + nz / 160)) * scale;
        const alpha = node.isCore ? 1.0 : Math.max(0, 1 - convergence * 1.5);

        projectedMap.set(node.id, { screenX, screenY, scale, node, alpha });
      });

      const coreProj = projectedMap.get("core");
      const cx = coreProj ? coreProj.screenX : centerX;
      const cy = coreProj ? coreProj.screenY : centerY;

      const targetTp = themeRef.current === "dark" ? 1.0 : 0.0;
      themeProgressRef.current += (targetTp - themeProgressRef.current) * 0.085;
      const tp = themeProgressRef.current;

      const isDarkHero = themeRef.current === "dark";

      // 1. ATMOSPHERIC AMBIENT GLOW FROM CORE
      if (coreProj && orbFadeAlpha > 0.005) {
        const baseGlowRadius = (isMobile ? 200 : 340) * (1 + coreIgnition * 0.5);
        const glowAlpha = (0.28 + smoothstep(0.2, 0.55, scroll) * 0.32) * orbFadeAlpha;

        const radialGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, baseGlowRadius);
        if (isDarkHero) {
          // Dark hero: soft luminous white radiating into warm amber bronze
          const stop0: [number, number, number] = [255, 245, 230];
          const stop1: [number, number, number] = [201, 137, 82];
          const stop2: [number, number, number] = [60, 80, 95];
          const stop3: [number, number, number] = darkPal.heroBg;

          radialGlow.addColorStop(0, rgbaStr(stop0, 0.90 * glowAlpha));
          radialGlow.addColorStop(0.30, rgbaStr(stop1, 0.60 * glowAlpha));
          radialGlow.addColorStop(0.65, rgbaStr(stop2, 0.25 * glowAlpha));
          radialGlow.addColorStop(1, rgbaStr(stop3, 0));
        } else {
          // Light hero: bright champagne white radiating into golden highlights
          const stop0: [number, number, number] = [255, 255, 255];
          const stop1: [number, number, number] = [255, 244, 224];
          const stop2: [number, number, number] = [238, 205, 160];
          const stop3: [number, number, number] = lightPal.heroBg;

          radialGlow.addColorStop(0, rgbaStr(stop0, 0.75 * glowAlpha));
          radialGlow.addColorStop(0.30, rgbaStr(stop1, 0.45 * glowAlpha));
          radialGlow.addColorStop(0.65, rgbaStr(stop2, 0.20 * glowAlpha));
          radialGlow.addColorStop(1, rgbaStr(stop3, 0));
        }

        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, baseGlowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Energy rings
        if (convergence < 0.75) {
          const ringAlpha = (1 - convergence) * (0.12 * (1 - tp) + 0.06 * tp) * orbFadeAlpha;
          const ringColor = lerpRgb(lightPal.education, darkPal.corporate, tp);
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

      // 2. CONNECTING PATHS
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

            const domainRgb = getDomainRgbHelper(tProj.node.domain, tp);
            const nodeBaseColor = rgbaStr(domainRgb, 1.0);

            if (isBranchActive) {
              ctx.strokeStyle = nodeBaseColor;
              ctx.lineWidth = 2.4;
              ctx.shadowColor = nodeBaseColor;
              ctx.shadowBlur = 6 * (1 - tp) + 12 * tp;
            } else {
              const isAux = source.isCore && tProj.node.domain === "auxiliary";
              const wireRgb = isAux
                ? lerpRgb(lightPal.corporate, [100, 116, 139], tp)
                : lerpRgb(lightPal.finance, darkPal.education, tp);
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

      // 3. PARTICLES
      if (convergence < 0.88) {
        const particles = particlesRef.current;
        particles.forEach((p) => {
          const sProj = projectedMap.get(p.sourceId);
          const tProj = projectedMap.get(p.targetId);
          if (!sProj || !tProj) return;

          const isBranchActive = activeDomain && p.domain === activeDomain;
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

          const particleRgb = getDomainRgbHelper(p.domain, tp);
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

      // 4. NODES
      nodes.forEach((node) => {
        if (node.isCore) return;

        const proj = projectedMap.get(node.id);
        if (!proj || proj.alpha <= 0.01) return;

        const { screenX, screenY, scale, alpha } = proj;
        const isHovered = activeDomain && node.domain === activeDomain;

        const nodeRgb = getDomainRgbHelper(node.domain, tp);
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
            ? ([255, 255, 255] as [number, number, number])
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

      // 5. EXPANDING OMNIAGENT AI CORE & RESIDUAL ORB ELIMINATION
      const pulse = Math.sin(t * 2.2) * 0.08 + 1;
      const currentCoreRadius = coreProj
        ? coreProj.node.radius * coreProj.scale * pulse * coreRadiusScale
        : 20;

      if (coreProj && orbFadeAlpha > 0.005) {
        ctx.save();

        if (coreIgnition < 0.65) {
          const ringAlpha =
            (1 - coreIgnition * 1.5) * (0.65 * (1 - tp) + 0.5 * tp) * orbFadeAlpha;
          const ringRgb1 = lerpRgb(lightPal.education, darkPal.corporate, tp);
          const ringRgb2 = lerpRgb(lightPal.finance, darkPal.education, tp);
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

        const coreGlowRadius = currentCoreRadius * (1.5 + coreIgnition * 0.9);
        const coreGrad = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          coreGlowRadius
        );

        if (isDarkHero) {
          // SCENARIO A: Dark Hero -> Pure white luminous emission that intensifies then completely fades
          const c0: [number, number, number] = [255, 255, 255];
          const c1: [number, number, number] = [255, 248, 235];
          const c2: [number, number, number] = [240, 215, 175];
          const c3: [number, number, number] = [201, 137, 82]; // warm amber bronze

          coreGrad.addColorStop(0, rgbaStr(c0, 1.0 * orbFadeAlpha));
          coreGrad.addColorStop(0.22, rgbaStr(c1, 1.0 * orbFadeAlpha));
          coreGrad.addColorStop(0.50, rgbaStr(c2, 0.95 * orbFadeAlpha));
          coreGrad.addColorStop(0.78, rgbaStr(c3, 0.85 * orbFadeAlpha));
          coreGrad.addColorStop(1, rgbaStr(c3, 0));

          ctx.beginPath();
          ctx.arc(cx, cy, coreGlowRadius, 0, Math.PI * 2);
          ctx.fillStyle = coreGrad;
          ctx.shadowColor = `rgba(255, 240, 215, ${0.9 * orbFadeAlpha})`;
          ctx.shadowBlur = (24 + coreIgnition * 35) * orbFadeAlpha;
          ctx.fill();

          // Central emitter: brilliant soft white light fading to 0 opacity before hero unpins
          const emitterRgb: [number, number, number] = [255, 255, 255];
          ctx.beginPath();
          ctx.arc(cx, cy, currentCoreRadius * (0.42 + coreIgnition * 0.35), 0, Math.PI * 2);
          ctx.fillStyle = rgbaStr(emitterRgb, 1.0 * orbFadeAlpha);
          ctx.shadowColor = `rgba(255, 255, 255, ${1.0 * orbFadeAlpha})`;
          ctx.shadowBlur = (18 + coreIgnition * 30) * orbFadeAlpha;
          ctx.fill();
        } else {
          // SCENARIO B: Light Hero -> Progressively develops a controlled dark/near-black glow then fades
          const c0 = lerpRgb([255, 255, 255], [11, 17, 24], coreIgnition);
          const c1 = lerpRgb([238, 205, 160], [22, 33, 43], coreIgnition);
          const c2 = lerpRgb([210, 165, 120], [45, 58, 68], coreIgnition);
          const c3 = lerpRgb([247, 243, 238], [11, 17, 24], coreIgnition);

          coreGrad.addColorStop(0, rgbaStr(c0, 1.0 * orbFadeAlpha));
          coreGrad.addColorStop(0.25, rgbaStr(c1, 1.0 * orbFadeAlpha));
          coreGrad.addColorStop(0.52, rgbaStr(c2, 0.90 * orbFadeAlpha));
          coreGrad.addColorStop(0.80, rgbaStr(c3, 0.70 * orbFadeAlpha));
          coreGrad.addColorStop(1, rgbaStr(c3, 0));

          ctx.beginPath();
          ctx.arc(cx, cy, coreGlowRadius, 0, Math.PI * 2);
          ctx.fillStyle = coreGrad;
          const darkShadow = lerpRgb([245, 215, 170], [11, 17, 24], coreIgnition);
          ctx.shadowColor = rgbaStr(darkShadow, 0.85 * orbFadeAlpha);
          ctx.shadowBlur = (20 + coreIgnition * 25) * orbFadeAlpha;
          ctx.fill();

          // Central emitter: Progressively shifts into controlled near-black center then fades
          const emitterRgb = lerpRgb([255, 255, 255], [11, 17, 24], coreIgnition);
          ctx.beginPath();
          ctx.arc(cx, cy, currentCoreRadius * (0.42 + coreIgnition * 0.35), 0, Math.PI * 2);
          ctx.fillStyle = rgbaStr(emitterRgb, 1.0 * orbFadeAlpha);
          ctx.shadowColor = rgbaStr(emitterRgb, 0.9 * orbFadeAlpha);
          ctx.shadowBlur = (14 + coreIgnition * 20) * orbFadeAlpha;
          ctx.fill();
        }

        if (convergence < 0.35 && orbFadeAlpha > 0.1) {
          ctx.font = `700 ${Math.max(10 * coreProj.scale, 9)}px 'JetBrains Mono', monospace`;
          const coreLabelRgb = isDarkHero ? [235, 226, 220] : [20, 30, 45];
          ctx.fillStyle = rgbaStr(coreLabelRgb as [number, number, number], 1.0 * orbFadeAlpha);
          ctx.textAlign = "center";
          const coreLabelShadowRgb = isDarkHero ? [0, 0, 0] : [255, 255, 255];
          ctx.shadowColor = rgbaStr(coreLabelShadowRgb as [number, number, number], 0.85 * orbFadeAlpha);
          ctx.shadowBlur = 4 * orbFadeAlpha;
          ctx.fillText("OMNIAGENT AI CORE", cx, cy + currentCoreRadius * 2.3);
        }

        ctx.restore();
      }

      // 6. FULL RADIAL CONTRAST BEAM EXPANSION
      if (radialExpandProgress > 0.001) {
        ctx.save();

        const maxCornerDistance = Math.hypot(
          Math.max(cx, width - cx),
          Math.max(cy, height - cy)
        );

        // Bounded bloom radius expanding outward smoothly
        const outerBloomRadius =
          currentCoreRadius +
          Math.pow(radialExpandProgress, 1.25) * (maxCornerDistance * 1.55);

        const innerProgress = smoothstep(0.15, 0.92, radialExpandProgress);
        const innerGlowRadius = Math.pow(innerProgress, 1.4) * (maxCornerDistance * 0.95);

        // Beam settles smoothly into destination background (0.90 -> 0.98)
        const transitionSettleAlpha = Math.max(0, 1 - smoothstep(0.90, 0.98, scroll));

        if (innerGlowRadius < outerBloomRadius && transitionSettleAlpha > 0.01) {
          const radialGrad = ctx.createRadialGradient(
            cx,
            cy,
            innerGlowRadius,
            cx,
            cy,
            outerBloomRadius
          );

          if (isDarkHero) {
            // SCENARIO A: DARK HERO -> BRIGHT WHITE LIGHT EXPANSION
            // Emits luminous white beam that transitions screen into Warm Ivory (#F7F3EE)
            const stop0: [number, number, number] = [255, 255, 255]; // Pure bright white
            const stop1: [number, number, number] = [255, 250, 240]; // Champagne white
            const stop2: [number, number, number] = [245, 230, 205]; // Soft gold highlight
            const stop3: [number, number, number] = [247, 243, 238]; // Warm linen light
            const stop4: [number, number, number] = [247, 243, 238]; // Destination warm ivory

            const a0 = Math.min(1.0, (0.95 + radialExpandProgress * 0.05) * transitionSettleAlpha);
            const a1 = Math.min(1.0, 0.85 * transitionSettleAlpha);
            const a2 = Math.min(1.0, 0.65 * transitionSettleAlpha);
            const a3 = Math.min(1.0, 0.35 * transitionSettleAlpha);

            radialGrad.addColorStop(0, rgbaStr(stop0, a0));
            radialGrad.addColorStop(0.22, rgbaStr(stop1, a1));
            radialGrad.addColorStop(0.50, rgbaStr(stop2, a2));
            radialGrad.addColorStop(0.80, rgbaStr(stop3, a3));
            radialGrad.addColorStop(1.0, rgbaStr(stop4, 0));
          } else {
            // SCENARIO B: LIGHT HERO -> CONTROLLED DARK/NEAR-BLACK BEAM EXPANSION
            // Emits near-black radial beam that transitions screen into Deep Navy (#0B1118)
            const stop0: [number, number, number] = [11, 17, 24]; // Controlled deep obsidian
            const stop1: [number, number, number] = [22, 33, 43]; // Slate navy dark tone
            const stop2: [number, number, number] = [45, 58, 68]; // Burnished dark bronze/slate
            const stop3: [number, number, number] = [18, 25, 33]; // Deep navy surface
            const stop4: [number, number, number] = [11, 17, 24]; // Destination deep navy

            const a0 = Math.min(1.0, (0.95 + radialExpandProgress * 0.05) * transitionSettleAlpha);
            const a1 = Math.min(1.0, 0.85 * transitionSettleAlpha);
            const a2 = Math.min(1.0, 0.65 * transitionSettleAlpha);
            const a3 = Math.min(1.0, 0.35 * transitionSettleAlpha);

            radialGrad.addColorStop(0, rgbaStr(stop0, a0));
            radialGrad.addColorStop(0.22, rgbaStr(stop1, a1));
            radialGrad.addColorStop(0.50, rgbaStr(stop2, a2));
            radialGrad.addColorStop(0.80, rgbaStr(stop3, a3));
            radialGrad.addColorStop(1.0, rgbaStr(stop4, 0));
          }

          ctx.fillStyle = radialGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, outerBloomRadius, 0, Math.PI * 2);
          ctx.fill();
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
      window.removeEventListener("resize", resize);
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
