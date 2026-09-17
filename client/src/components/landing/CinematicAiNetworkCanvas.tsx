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
    agents: ["Study Planning Agent", "Quiz & Exam Generator", "Socratic Summarizer"],
    tools: ["Academic RAG", "Notion Sync", "Canvas LMS Webhook"],
    metrics: "99.4% Citation Accuracy",
  },
  finance: {
    id: "finance",
    name: "FINANCE",
    tagline: "Audit-Ready Fiscal Intelligence",
    color: "#2DD4BF",
    glowColor: "rgba(45, 212, 191, 0.4)",
    agents: ["Invoice Anomaly Parser", "Ledger Auditor Agent", "Compliance & Risk Q&A"],
    tools: ["PDF Table OCR", "Variance Gate", "Slack Escalations"],
    metrics: "Zero-Shot Deterministic Audit",
  },
  corporate: {
    id: "corporate",
    name: "CORPORATE",
    tagline: "Enterprise Operations & Knowledge",
    color: "#00F2FE",
    glowColor: "rgba(0, 242, 254, 0.4)",
    agents: ["Email Ingestion Reasoner", "Autonomous Scheduler", "Policy Knowledge Graph"],
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
  className?: string;
}

export const CinematicAiNetworkCanvas: React.FC<CinematicCanvasProps> = ({
  activeDomain,
  onHoverDomain,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  // Define the 3D topology nodes
  const nodesRef = useRef<Node3D[]>([
    // Central Core
    {
      id: "core",
      label: "OMNIAGENT CORE",
      subLabel: "Neural Orchestrator",
      isCore: true,
      x: 0,
      y: -10,
      z: 0,
      radius: 18,
      color: "#00F2FE",
      connections: ["edu_head", "fin_head", "corp_head", "aux_research", "aux_memory", "aux_analytics"],
    },

    // Auxiliary Top Layer (Neural foundation)
    {
      id: "aux_research",
      label: "RESEARCH",
      domain: "auxiliary",
      x: -160,
      y: -105,
      z: -40,
      radius: 5,
      color: "#64748B",
      connections: [],
    },
    {
      id: "aux_memory",
      label: "MEMORY & RAG",
      domain: "auxiliary",
      x: 0,
      y: -130,
      z: -60,
      radius: 5,
      color: "#64748B",
      connections: [],
    },
    {
      id: "aux_analytics",
      label: "ANALYTICS",
      domain: "auxiliary",
      x: 160,
      y: -105,
      z: -40,
      radius: 5,
      color: "#64748B",
      connections: [],
    },

    // EDUCATION BRANCH (Left perspective)
    {
      id: "edu_head",
      label: "EDUCATION",
      subLabel: "Pedagogy Hub",
      domain: "education",
      isDomainHead: true,
      x: -240,
      y: 65,
      z: 40,
      radius: 11,
      color: "#38BDF8",
      connections: ["edu_sub_1", "edu_sub_2", "edu_sub_3"],
    },
    {
      id: "edu_sub_1",
      label: "Study Planning",
      domain: "education",
      x: -340,
      y: 10,
      z: 80,
      radius: 6,
      color: "#38BDF8",
      connections: [],
    },
    {
      id: "edu_sub_2",
      label: "Quiz Generator",
      domain: "education",
      x: -310,
      y: 140,
      z: 90,
      radius: 6,
      color: "#38BDF8",
      connections: [],
    },
    {
      id: "edu_sub_3",
      label: "Summarization",
      domain: "education",
      x: -400,
      y: 85,
      z: 120,
      radius: 6,
      color: "#38BDF8",
      connections: [],
    },

    // FINANCE BRANCH (Center-Down perspective)
    {
      id: "fin_head",
      label: "FINANCE",
      subLabel: "Fiscal Hub",
      domain: "finance",
      isDomainHead: true,
      x: 0,
      y: 115,
      z: 50,
      radius: 11,
      color: "#2DD4BF",
      connections: ["fin_sub_1", "fin_sub_2", "fin_sub_3"],
    },
    {
      id: "fin_sub_1",
      label: "Invoice Parser",
      domain: "finance",
      x: -95,
      y: 195,
      z: 90,
      radius: 6,
      color: "#2DD4BF",
      connections: [],
    },
    {
      id: "fin_sub_2",
      label: "Report Synthesis",
      domain: "finance",
      x: 0,
      y: 225,
      z: 110,
      radius: 6,
      color: "#2DD4BF",
      connections: [],
    },
    {
      id: "fin_sub_3",
      label: "Compliance Q&A",
      domain: "finance",
      x: 95,
      y: 195,
      z: 90,
      radius: 6,
      color: "#2DD4BF",
      connections: [],
    },

    // CORPORATE BRANCH (Right perspective)
    {
      id: "corp_head",
      label: "CORPORATE",
      subLabel: "Operations Hub",
      domain: "corporate",
      isDomainHead: true,
      x: 240,
      y: 65,
      z: 40,
      radius: 11,
      color: "#00F2FE",
      connections: ["corp_sub_1", "corp_sub_2", "corp_sub_3"],
    },
    {
      id: "corp_sub_1",
      label: "Email Ingestion",
      domain: "corporate",
      x: 340,
      y: 10,
      z: 80,
      radius: 6,
      color: "#00F2FE",
      connections: [],
    },
    {
      id: "corp_sub_2",
      label: "Auto Scheduler",
      domain: "corporate",
      x: 310,
      y: 140,
      z: 90,
      radius: 6,
      color: "#00F2FE",
      connections: [],
    },
    {
      id: "corp_sub_3",
      label: "Knowledge Graph",
      domain: "corporate",
      x: 400,
      y: 85,
      z: 120,
      radius: 6,
      color: "#00F2FE",
      connections: [],
    },
  ]);

  // Particles state
  const particlesRef = useRef<Particle[]>([]);

  // Initialize particles along the graph paths
  useEffect(() => {
    const nodes = nodesRef.current;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const newParticles: Particle[] = [];

    // Create particle pools for each connection
    nodes.forEach((source) => {
      source.connections.forEach((targetId) => {
        const target = nodeMap.get(targetId);
        if (!target) return;

        // Number of particles based on branch importance
        const count = source.isCore ? 5 : 3;
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

  // Screen resize tracking
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mouse move handler for parallax tilt
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2; // -1 to 1

    mouseRef.current.targetX = x * 28; // Max tilt offset px
    mouseRef.current.targetY = y * 20;
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.targetX = 0;
    mouseRef.current.targetY = 0;
    onHoverDomain(null);
  }, [onHoverDomain]);

  // Check hit tests on canvas click/move
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Find if mouse is over any domain node
      const nodes = nodesRef.current;
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height * (isMobile ? 0.38 : 0.44);
      const focalLength = isMobile ? 360 : 500;
      const mobileScaleMultiplier = isMobile ? 0.65 : 1.0;

      const pX = mouseRef.current.x;
      const pY = mouseRef.current.y;

      let hovered: string | null = null;

      for (const node of nodes) {
        if (!node.domain || node.domain === "auxiliary") continue;

        const nodeX = node.x * mobileScaleMultiplier;
        const nodeY = node.y * mobileScaleMultiplier;
        const nodeZ = node.z;

        const scale = focalLength / (focalLength + nodeZ);
        const screenX = centerX + (nodeX + pX * (1 + nodeZ / 150)) * scale;
        const screenY = centerY + (nodeY + pY * (1 + nodeZ / 150)) * scale;
        const hitRadius = (node.radius + 16) * scale;

        const dist = Math.hypot(clickX - screenX, clickY - screenY);
        if (dist <= hitRadius) {
          hovered = node.domain;
          break;
        }
      }

      onHoverDomain(hovered);
    },
    [onHoverDomain, isMobile]
  );

  // Main Render Loop
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

      // Parallax smoothing (lerp)
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

      const centerX = width / 2;
      const centerY = height * (isMobile ? 0.38 : 0.44);
      const focalLength = isMobile ? 360 : 500;
      const mobileScaleMultiplier = isMobile ? 0.65 : 1.0;

      // Project 3D node coordinates
      const nodes = nodesRef.current;
      const projectedMap = new Map<
        string,
        { screenX: number; screenY: number; scale: number; node: Node3D }
      >();

      nodes.forEach((node) => {
        const nodeX = node.x * mobileScaleMultiplier;
        const nodeY = node.y * mobileScaleMultiplier;
        const nodeZ = node.z;

        const scale = focalLength / (focalLength + nodeZ);
        const screenX = centerX + (nodeX + mouse.x * (1 + nodeZ / 150)) * scale;
        const screenY = centerY + (nodeY + mouse.y * (1 + nodeZ / 150)) * scale;

        projectedMap.set(node.id, { screenX, screenY, scale, node });
      });

      // -------------------------------------------------------------
      // 1. Draw Background Perspective Depth Grid / Atmospheric Rings
      // -------------------------------------------------------------
      const coreProj = projectedMap.get("core");
      if (coreProj) {
        const { screenX: cx, screenY: cy } = coreProj;

        // Subtle perspective concentric orbits
        ctx.save();
        for (let r = 70; r <= 360; r += 75) {
          ctx.beginPath();
          ctx.ellipse(
            cx,
            cy + (r * 0.2),
            r * mobileScaleMultiplier,
            r * 0.42 * mobileScaleMultiplier,
            0,
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = "rgba(0, 242, 254, 0.04)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 12]);
          ctx.stroke();
        }
        ctx.restore();

        // Atmospheric central radial glow
        const radialGlow = ctx.createRadialGradient(
          cx,
          cy,
          4,
          cx,
          cy,
          isMobile ? 180 : 340
        );
        radialGlow.addColorStop(0, "rgba(0, 242, 254, 0.16)");
        radialGlow.addColorStop(0.3, "rgba(14, 165, 233, 0.08)");
        radialGlow.addColorStop(0.7, "rgba(45, 212, 191, 0.02)");
        radialGlow.addColorStop(1, "rgba(6, 9, 15, 0)");
        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, isMobile ? 180 : 340, 0, Math.PI * 2);
        ctx.fill();
      }

      // -------------------------------------------------------------
      // 2. Draw Circuit & Neural Network Connection Paths
      // -------------------------------------------------------------
      nodes.forEach((source) => {
        const sProj = projectedMap.get(source.id);
        if (!sProj) return;

        source.connections.forEach((targetId) => {
          const tProj = projectedMap.get(targetId);
          if (!tProj) return;

          const isBranchActive =
            activeDomain &&
            (tProj.node.domain === activeDomain || source.domain === activeDomain);

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(sProj.screenX, sProj.screenY);

          // Render curved cybernetic path
          const midX = (sProj.screenX + tProj.screenX) / 2;
          const midY = (sProj.screenY + tProj.screenY) / 2 + 10;
          ctx.quadraticCurveTo(midX, midY, tProj.screenX, tProj.screenY);

          // Path styling
          if (isBranchActive) {
            ctx.strokeStyle = tProj.node.color || "#00F2FE";
            ctx.lineWidth = 2.4;
            ctx.shadowColor = tProj.node.color || "#00F2FE";
            ctx.shadowBlur = 12;
          } else {
            ctx.strokeStyle =
              source.isCore && tProj.node.domain === "auxiliary"
                ? "rgba(100, 116, 139, 0.15)"
                : "rgba(56, 189, 248, 0.18)";
            ctx.lineWidth = 1.2;
            ctx.shadowBlur = 0;
          }

          ctx.stroke();
          ctx.restore();
        });
      });

      // -------------------------------------------------------------
      // 3. Draw Travelling Glowing Particles (Information Flow)
      // -------------------------------------------------------------
      const particles = particlesRef.current;
      particles.forEach((p) => {
        const sProj = projectedMap.get(p.sourceId);
        const tProj = projectedMap.get(p.targetId);
        if (!sProj || !tProj) return;

        const isBranchActive = activeDomain && p.domain === activeDomain;

        // Progress particle
        const currentSpeed = isBranchActive ? p.speed * 1.8 : p.speed;
        p.t += currentSpeed;
        if (p.t > 1) {
          p.t = 0;
        }

        // Compute quadratic bezier point
        const midX = (sProj.screenX + tProj.screenX) / 2;
        const midY = (sProj.screenY + tProj.screenY) / 2 + 10;

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

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, Math.max(radius, 1), 0, Math.PI * 2);

        if (isBranchActive) {
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
        } else {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
        }

        ctx.fill();

        // Draw particle tail on desktop
        if (!isMobile) {
          const tailT = Math.max(0, p.t - 0.04);
          const invTailT = 1 - tailT;
          const tailX =
            invTailT * invTailT * sProj.screenX +
            2 * invTailT * tailT * midX +
            tailT * tailT * tProj.screenX;
          const tailY =
            invTailT * invTailT * sProj.screenY +
            2 * invTailT * tailT * midY +
            tailT * tailT * tProj.screenY;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tailX, tailY);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = radius * 0.8;
          ctx.stroke();
        }

        ctx.restore();
      });

      // -------------------------------------------------------------
      // 4. Draw Nodes (Core, Domain Heads, Sub-Nodes)
      // -------------------------------------------------------------
      nodes.forEach((node) => {
        const proj = projectedMap.get(node.id);
        if (!proj) return;

        const { screenX, screenY, scale } = proj;
        const isHovered = activeDomain && node.domain === activeDomain;

        ctx.save();

        if (node.isCore) {
          // ================= OMNIAGENT CENTRAL CORE =================
          const pulse = Math.sin(t * 2.2) * 0.08 + 1;
          const coreRadius = node.radius * scale * pulse;

          // Outer rotating ring with data ticks
          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.rotate(t * 0.4);
          ctx.beginPath();
          ctx.arc(0, 0, coreRadius * 2.1, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0, 242, 254, 0.4)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([6, 8, 2, 8]);
          ctx.stroke();

          // Second counter-rotating ring
          ctx.rotate(-t * 0.8);
          ctx.beginPath();
          ctx.arc(0, 0, coreRadius * 2.8, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(45, 212, 191, 0.25)";
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 14]);
          ctx.stroke();
          ctx.restore();

          // Core radiant gradient sphere
          const coreGrad = ctx.createRadialGradient(
            screenX,
            screenY,
            0,
            screenX,
            screenY,
            coreRadius * 1.8
          );
          coreGrad.addColorStop(0, "#FFFFFF");
          coreGrad.addColorStop(0.25, "#00F2FE");
          coreGrad.addColorStop(0.6, "#0EA5E9");
          coreGrad.addColorStop(1, "rgba(14, 165, 233, 0)");

          ctx.beginPath();
          ctx.arc(screenX, screenY, coreRadius * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = coreGrad;
          ctx.shadowColor = "#00F2FE";
          ctx.shadowBlur = 24;
          ctx.fill();

          // Central solid white-hot emitter
          ctx.beginPath();
          ctx.arc(screenX, screenY, coreRadius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = "#FFFFFF";
          ctx.shadowBlur = 10;
          ctx.fill();

          // Central Core Label Badge
          ctx.font = `600 ${Math.max(10 * scale, 9)}px 'JetBrains Mono', monospace`;
          ctx.fillStyle = "#E0F2FE";
          ctx.textAlign = "center";
          ctx.shadowColor = "rgba(0,0,0,0.8)";
          ctx.shadowBlur = 4;
          ctx.fillText("AI CORE", screenX, screenY - coreRadius * 2.8);
          ctx.restore();
        } else if (node.isDomainHead) {
          // ================= DOMAIN HEAD NODES =================
          const nodeRadius = node.radius * scale * (isHovered ? 1.35 : 1.0);
          const domainColor = node.color;

          // Pulse ring if hovered
          if (isHovered) {
            const glowRing = (Math.sin(t * 4) * 0.15 + 1) * nodeRadius * 1.8;
            ctx.beginPath();
            ctx.arc(screenX, screenY, glowRing, 0, Math.PI * 2);
            ctx.strokeStyle = domainColor;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
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

          // Domain Label
          ctx.font = `700 ${Math.max(11 * scale, 10)}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = isHovered ? "#FFFFFF" : "#CBD5E1";
          ctx.textAlign = "center";
          ctx.shadowColor = "rgba(0,0,0,0.9)";
          ctx.shadowBlur = 6;
          ctx.fillText(node.label, screenX, screenY + nodeRadius + 14 * scale);

          // Sub-label / domain role
          if (node.subLabel && !isMobile) {
            ctx.font = `500 ${Math.max(9 * scale, 8)}px 'JetBrains Mono', monospace`;
            ctx.fillStyle = isHovered ? domainColor : "#64748B";
            ctx.fillText(node.subLabel, screenX, screenY + nodeRadius + 26 * scale);
          }
          ctx.restore();
        } else {
          // ================= SUB-NODES / AUXILIARY =================
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

          // Micro label for sub-node
          if (!isMobile && (isHovered || node.domain === "auxiliary")) {
            ctx.font = `500 ${Math.max(8.5 * scale, 7.5)}px 'JetBrains Mono', monospace`;
            ctx.fillStyle = isHovered ? "#F8FAFC" : "#94A3B8";
            ctx.textAlign = "center";
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 4;
            ctx.fillText(node.label, screenX, screenY + subRadius + 11 * scale);
          }
          ctx.restore();
        }
      });

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
  }, [activeDomain, isMobile]);

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
