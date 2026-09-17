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
  domain?: "education" | "finance" | "corporate" | "auxiliary" | "exit";
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
  className?: string;
}

// Smooth interpolation helper
function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export const CinematicAiNetworkCanvas: React.FC<CinematicCanvasProps> = ({
  activeDomain,
  onHoverDomain,
  scrollProgress = 0,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const scrollRef = useRef<number>(0);

  // Synchronize scroll progress into ref for 60fps render loop
  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

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
      y: 40, // Centered in the open visual space beneath the headline
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

  // Mouse move handler for subtle parallax
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

  // Hit testing for interactive nodes
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

  // Main 60fps Canvas Render Loop with Cinematic Light Expansion Transition
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
      // SCROLL STAGES & CINEMATIC TRANSITION VALUES
      // -------------------------------------------------------------
      const scroll = Math.max(0, Math.min(1, scrollRef.current));

      // 1. Convergence factor (nodes pull toward central core)
      const convergence = smoothstep(0.12, 0.68, scroll);

      // 2. Camera push-in & Core Scale
      const cameraPushScale = 1 + smoothstep(0.25, 0.85, scroll) * 2.5;

      // 3. Core expansion & radial bloom factor
      const coreExpandProgress = smoothstep(0.40, 0.88, scroll);
      const coreRadiusScale = 1 + Math.pow(coreExpandProgress, 2.4) * 18;

      // 4. Viewport Light Bloom Illumination
      const lightBloomAlpha = smoothstep(0.48, 0.92, scroll);

      // Center of projection
      const centerX = width / 2;
      const centerY = height * 0.54;
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

        // Converge toward core position as scroll increases
        if (!node.isCore) {
          nx = nx * (1 - convergence) + (coreNode.x * mobileScaleMultiplier) * convergence;
          ny = ny * (1 - convergence) + (coreNode.y * mobileScaleMultiplier) * convergence;
          nz = nz * (1 - convergence) + coreNode.z * convergence;
        }

        const scale = focalLength / (focalLength + nz);
        const screenX = centerX + (nx + mouse.x * (1 - convergence * 0.8) * (1 + nz / 160)) * scale;
        const screenY = centerY + (ny + mouse.y * (1 - convergence * 0.8) * (1 + nz / 160)) * scale;

        // Node opacity: peripheral nodes fade into the light as convergence completes
        const alpha = node.isCore ? 1.0 : Math.max(0, 1 - convergence * 1.3);

        projectedMap.set(node.id, { screenX, screenY, scale, node, alpha });
      });

      const coreProj = projectedMap.get("core");
      const cx = coreProj ? coreProj.screenX : centerX;
      const cy = coreProj ? coreProj.screenY : centerY;

      // -------------------------------------------------------------
      // 1. DRAW ATMOSPHERIC AMBIENT GLOW (Originated FROM Core)
      // -------------------------------------------------------------
      if (coreProj) {
        const baseGlowRadius = (isMobile ? 220 : 380) * (1 + coreExpandProgress * 2.5);
        const glowAlpha = 0.22 + coreExpandProgress * 0.5;

        const radialGlow = ctx.createRadialGradient(cx, cy, 4, cx, cy, baseGlowRadius);
        radialGlow.addColorStop(0, `rgba(0, 242, 254, ${glowAlpha})`);
        radialGlow.addColorStop(0.3, `rgba(14, 165, 233, ${glowAlpha * 0.6})`);
        radialGlow.addColorStop(0.65, `rgba(45, 212, 191, ${glowAlpha * 0.2})`);
        radialGlow.addColorStop(1, "rgba(6, 9, 15, 0)");

        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, baseGlowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Concentric computational energy rings (fade out during expansion)
        if (convergence < 0.8) {
          const ringAlpha = (1 - convergence) * 0.05;
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
            ctx.strokeStyle = `rgba(0, 242, 254, ${ringAlpha})`;
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
      if (convergence < 0.95) {
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

            if (isBranchActive) {
              ctx.strokeStyle = tProj.node.color || "#00F2FE";
              ctx.lineWidth = 2.4;
              ctx.shadowColor = tProj.node.color || "#00F2FE";
              ctx.shadowBlur = 12;
            } else {
              ctx.strokeStyle =
                source.isCore && tProj.node.domain === "auxiliary"
                  ? `rgba(100, 116, 139, ${0.16 * pathAlpha})`
                  : `rgba(56, 189, 248, ${0.22 * pathAlpha})`;
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
      if (convergence < 0.9) {
        const particles = particlesRef.current;
        particles.forEach((p) => {
          const sProj = projectedMap.get(p.sourceId);
          const tProj = projectedMap.get(p.targetId);
          if (!sProj || !tProj) return;

          const isBranchActive = activeDomain && p.domain === activeDomain;

          // Flow direction: outward normally, accelerates inward during convergence
          const speedMultiplier = 1 + scroll * 3.5;
          const currentSpeed = isBranchActive ? p.speed * 2.2 : p.speed * speedMultiplier;

          if (scroll > 0.25) {
            // Inward flow toward core
            p.t -= currentSpeed;
            if (p.t < 0) p.t = 1;
          } else {
            // Outward flow
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
          const pAlpha = Math.min(sProj.alpha, tProj.alpha) * (1 - smoothstep(0.65, 0.9, scroll));

          if (pAlpha <= 0.01) return;

          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, Math.max(radius, 1), 0, Math.PI * 2);

          ctx.fillStyle = p.color;
          ctx.globalAlpha = pAlpha;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fill();

          ctx.restore();
        });
      }

      // -------------------------------------------------------------
      // 4. DRAW NODES (Domain Heads & Sub-Nodes)
      // -------------------------------------------------------------
      nodes.forEach((node) => {
        if (node.isCore) return; // Core drawn in dedicated layer

        const proj = projectedMap.get(node.id);
        if (!proj || proj.alpha <= 0.01) return;

        const { screenX, screenY, scale, alpha } = proj;
        const isHovered = activeDomain && node.domain === activeDomain;

        ctx.save();
        ctx.globalAlpha = alpha;

        if (node.isDomainHead) {
          const nodeRadius = node.radius * scale * (isHovered ? 1.35 : 1.0);
          const domainColor = node.color;

          // Pulse ring if hovered
          if (isHovered) {
            const glowRing = (Math.sin(t * 4) * 0.15 + 1) * nodeRadius * 1.8;
            ctx.beginPath();
            ctx.arc(screenX, screenY, glowRing, 0, Math.PI * 2);
            ctx.strokeStyle = domainColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Node body
          ctx.beginPath();
          ctx.arc(screenX, screenY, nodeRadius, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? domainColor : "#0A101D";
          ctx.strokeStyle = domainColor;
          ctx.lineWidth = isHovered ? 2.5 : 1.5;
          ctx.shadowColor = domainColor;
          ctx.shadowBlur = isHovered ? 18 : 8;
          ctx.fill();
          ctx.stroke();

          // Inner bright beacon
          ctx.beginPath();
          ctx.arc(screenX, screenY, nodeRadius * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? "#FFFFFF" : domainColor;
          ctx.fill();

          // Domain Label (hidden during convergence)
          if (alpha > 0.5) {
            ctx.font = `700 ${Math.max(11 * scale, 10)}px system-ui, -apple-system, sans-serif`;
            ctx.fillStyle = isHovered ? "#FFFFFF" : "#E2E8F0";
            ctx.textAlign = "center";
            ctx.shadowColor = "rgba(0,0,0,0.9)";
            ctx.shadowBlur = 6;
            ctx.fillText(node.label, screenX, screenY - nodeRadius - 8 * scale);
          }
        } else {
          // Sub-nodes
          const subRadius = node.radius * scale * (isHovered ? 1.25 : 1.0);

          ctx.beginPath();
          ctx.arc(screenX, screenY, subRadius, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? node.color : "#0D1526";
          ctx.strokeStyle = isHovered ? "#FFFFFF" : node.color;
          ctx.lineWidth = isHovered ? 1.8 : 1.0;
          ctx.shadowColor = node.color;
          ctx.shadowBlur = isHovered ? 12 : 4;
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      });

      // -------------------------------------------------------------
      // 5. DRAW EXPANDING OMNIAGENT AI CORE & RADIANT LIGHT TRANSITION
      // -------------------------------------------------------------
      if (coreProj) {
        ctx.save();
        const pulse = Math.sin(t * 2.2) * 0.08 + 1;
        const currentCoreRadius = coreProj.node.radius * coreProj.scale * pulse * coreRadiusScale;

        // Outer rotating telemetry rings (fade out smoothly during massive expansion)
        if (coreExpandProgress < 0.75) {
          const ringAlpha = (1 - coreExpandProgress * 1.3) * 0.5;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t * 0.4);
          ctx.beginPath();
          ctx.arc(0, 0, currentCoreRadius * 2.2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 242, 254, ${ringAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([6, 8, 2, 8]);
          ctx.stroke();

          ctx.rotate(-t * 0.8);
          ctx.beginPath();
          ctx.arc(0, 0, currentCoreRadius * 2.9, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(45, 212, 191, ${ringAlpha * 0.7})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 14]);
          ctx.stroke();
          ctx.restore();
        }

        // Core radiant gradient sphere
        const coreGrad = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          currentCoreRadius * (1.8 + coreExpandProgress * 4.0)
        );
        coreGrad.addColorStop(0, "#FFFFFF");
        coreGrad.addColorStop(0.18, "#E0F2FE");
        coreGrad.addColorStop(0.40, "#00F2FE");
        coreGrad.addColorStop(0.70, `rgba(14, 165, 233, ${0.9 - coreExpandProgress * 0.3})`);
        coreGrad.addColorStop(1, "rgba(14, 165, 233, 0)");

        ctx.beginPath();
        ctx.arc(cx, cy, currentCoreRadius * (1.8 + coreExpandProgress * 4.0), 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = "#00F2FE";
        ctx.shadowBlur = 28 + coreExpandProgress * 50;
        ctx.fill();

        // Central white-hot emitter
        ctx.beginPath();
        ctx.arc(cx, cy, currentCoreRadius * (0.45 + coreExpandProgress * 0.8), 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "#FFFFFF";
        ctx.shadowBlur = 14 + coreExpandProgress * 30;
        ctx.fill();

        // Core Label (fades out as convergence begins)
        if (convergence < 0.25) {
          ctx.font = `700 ${Math.max(10 * coreProj.scale, 9)}px 'JetBrains Mono', monospace`;
          ctx.fillStyle = "#E0F2FE";
          ctx.textAlign = "center";
          ctx.shadowColor = "rgba(0,0,0,0.9)";
          ctx.shadowBlur = 5;
          ctx.fillText("OMNIAGENT AI CORE", cx, cy + currentCoreRadius * 2.6);
        }

        // -------------------------------------------------------------
        // 6. VIEWPORT LUMINOUS FIELD EXPANSION (Originating FROM Core)
        // -------------------------------------------------------------
        if (lightBloomAlpha > 0.01) {
          const maxBloomRadius = Math.max(width, height) * 1.4;
          const bloomGrad = ctx.createRadialGradient(
            cx,
            cy,
            currentCoreRadius * 0.5,
            cx,
            cy,
            maxBloomRadius
          );
          bloomGrad.addColorStop(0, `rgba(255, 255, 255, ${lightBloomAlpha * 0.95})`);
          bloomGrad.addColorStop(0.25, `rgba(224, 242, 254, ${lightBloomAlpha * 0.85})`);
          bloomGrad.addColorStop(0.55, `rgba(0, 242, 254, ${lightBloomAlpha * 0.65})`);
          bloomGrad.addColorStop(0.85, `rgba(14, 165, 233, ${lightBloomAlpha * 0.35})`);
          bloomGrad.addColorStop(1, `rgba(6, 9, 15, ${lightBloomAlpha * 0.1})`);

          ctx.fillStyle = bloomGrad;
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
