import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";
import type {
  AgentWorkflowConfig,
  RequiredAgent,
  WorkflowNodeDetail,
  WorkflowNodeType,
  WorkflowStep,
} from "../types/workflow";

export type WorkflowFlowNode = Node<{ detail: WorkflowNodeDetail }>;

const NODE_WIDTH = 260;
const NODE_HEIGHT = 120;

function inferNodeType(
  label: string,
  context: "step" | "tool" | "trigger" | "success" | "edge" | "orchestrator"
): WorkflowNodeType {
  const lower = label.toLowerCase();
  if (context === "trigger") return "trigger";
  if (context === "orchestrator") return "orchestrator";
  if (context === "success") return "success";
  if (context === "edge") return "edge_case";
  if (context === "tool") return "tool";
  if (
    lower.includes("approval") ||
    lower.includes("confirm") ||
    lower.includes("user review")
  ) {
    return "approval";
  }
  if (
    lower.includes("if ") ||
    lower.includes("decide") ||
    lower.includes("branch") ||
    lower.includes("condition")
  ) {
    return "decision";
  }
  return "agent";
}

function findAgent(
  agents: RequiredAgent[] | undefined,
  agentName: string
): RequiredAgent | undefined {
  if (!agents?.length) return undefined;
  const normalized = agentName.toLowerCase();
  return agents.find(
    (a) =>
      a.agent_name.toLowerCase() === normalized ||
      normalized.includes(a.agent_name.toLowerCase()) ||
      a.agent_name.toLowerCase().includes(normalized)
  );
}

function stepNodeDetail(
  step: WorkflowStep,
  agent: RequiredAgent | undefined,
  config: AgentWorkflowConfig
): WorkflowNodeDetail {
  const type = inferNodeType(step.description || step.agent, "step");
  return {
    id: `step-${step.step}`,
    type,
    label: step.agent || `Step ${step.step}`,
    subtitle: agent?.role,
    preview: step.description,
    responsibilities: agent?.responsibilities,
    inputs: step.input ? [step.input] : config.inputs_required,
    outputs: step.output ? [step.output] : undefined,
    tools: config.tools_required,
    constraints: config.constraints,
    executionOrder: step.step,
    status: type === "approval" ? "pending" : "ready",
  };
}

export function buildWorkflowGraph(config: AgentWorkflowConfig): {
  nodes: WorkflowFlowNode[];
  edges: Edge[];
} {
  const nodes: WorkflowFlowNode[] = [];
  const edges: Edge[] = [];
  const agents = config.required_agents ?? [];
  const steps = [...(config.workflow ?? [])].sort((a, b) => a.step - b.step);
  const tools = config.tools_required ?? [];
  const edgeCases = config.edge_cases ?? [];
  const successCriteria = config.success_criteria ?? [];

  let order = 0;
  const link = (source: string, target: string) => {
    edges.push({
      id: `e-${source}-${target}`,
      source,
      target,
      animated: true,
      style: { stroke: "hsl(211 100% 50%)", strokeWidth: 2 },
    });
  };

  const triggerId = "trigger";
  nodes.push({
    id: triggerId,
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: {
      detail: {
        id: triggerId,
        type: "trigger",
        label: "Start",
        subtitle: config.trigger_type ?? "manual",
        preview: config.task_summary,
        inputs: config.inputs_required,
        status: "ready",
        executionOrder: ++order,
      },
    },
  });

  let prevId = triggerId;

  if (agents.length > 1) {
    const orchId = "orchestrator";
    nodes.push({
      id: orchId,
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: {
        detail: {
          id: orchId,
          type: "orchestrator",
          label: "Orchestrator Agent",
          subtitle: "Multi-agent coordination",
          preview: `Routes tasks across ${agents.length} specialized agents`,
          responsibilities: agents.map((a) => `${a.agent_name}: ${a.role}`),
          status: "ready",
          executionOrder: ++order,
        },
      },
    });
    link(prevId, orchId);
    prevId = orchId;
  }

  const usedToolIds = new Set<string>();

  steps.forEach((step) => {
    const stepId = `step-${step.step}`;
    const agent = findAgent(agents, step.agent);
    nodes.push({
      id: stepId,
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: { detail: stepNodeDetail(step, agent, config) },
    });
    link(prevId, stepId);
    prevId = stepId;

    const stepTools = tools.filter((tool) => {
      const t = tool.toLowerCase();
      const desc = (step.description + step.agent + step.input + step.output).toLowerCase();
      return desc.includes(t.split(" ")[0]) || desc.includes(t.replace(/\s+/g, ""));
    });

    stepTools.forEach((tool, idx) => {
      const toolId = `tool-${tool.replace(/\W+/g, "-").toLowerCase()}-${idx}`;
      if (usedToolIds.has(toolId)) return;
      usedToolIds.add(toolId);
      nodes.push({
        id: toolId,
        type: "workflowNode",
        position: { x: 0, y: 0 },
        data: {
          detail: {
            id: toolId,
            type: "tool",
            label: tool,
            subtitle: "API / Integration",
            preview: `Executes via ${tool}`,
            status: "ready",
            executionOrder: ++order,
          },
        },
      });
      link(prevId, toolId);
      prevId = toolId;
    });
  });

  tools.forEach((tool, idx) => {
    const toolId = `tool-global-${idx}`;
    if ([...usedToolIds].some((id) => id.includes(tool.replace(/\W+/g, "-").toLowerCase()))) {
      return;
    }
    nodes.push({
      id: toolId,
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: {
        detail: {
          id: toolId,
          type: "tool",
          label: tool,
          subtitle: "API / Integration",
          preview: `Required tool: ${tool}`,
          status: "ready",
          executionOrder: ++order,
        },
      },
    });
    link(prevId, toolId);
    prevId = toolId;
  });

  if (edgeCases.length > 0) {
    const edgeId = "edge-cases";
    nodes.push({
      id: edgeId,
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: {
        detail: {
          id: edgeId,
          type: "edge_case",
          label: "Edge Case Handler",
          subtitle: "Error & fallback paths",
          preview: edgeCases[0],
          edgeCases,
          status: "warning",
          executionOrder: ++order,
        },
      },
    });
    link(prevId, edgeId);
    prevId = edgeId;
  }

  const successId = "success";
  nodes.push({
    id: successId,
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: {
      detail: {
        id: successId,
        type: "success",
        label: "Final Output",
        subtitle: "Success criteria met",
        preview: successCriteria[0] ?? config.expected_outputs?.[0] ?? "Workflow complete",
        outputs: config.expected_outputs ?? successCriteria,
        status: "ready",
        executionOrder: ++order,
      },
    },
  });
  link(prevId, successId);

  return layoutGraph(nodes, edges);
}

function layoutGraph(
  nodes: WorkflowFlowNode[],
  edges: Edge[]
): { nodes: WorkflowFlowNode[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 100 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const laidOut = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: laidOut, edges };
}

export function buildFallbackGraph(raw: string): {
  nodes: WorkflowFlowNode[];
  edges: Edge[];
} {
  const nodes: WorkflowFlowNode[] = [
    {
      id: "trigger",
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: {
        detail: {
          id: "trigger",
          type: "trigger",
          label: "Start",
          preview: "Workflow trigger",
          status: "ready",
        },
      },
    },
    {
      id: "output",
      type: "workflowNode",
      position: { x: 300, y: 0 },
      data: {
        detail: {
          id: "output",
          type: "output",
          label: "AI Output",
          preview: raw.slice(0, 120) + (raw.length > 120 ? "…" : ""),
          status: "ready",
        },
      },
    },
  ];
  const edges: Edge[] = [
    {
      id: "e-trigger-output",
      source: "trigger",
      target: "output",
      animated: true,
      style: { stroke: "hsl(211 100% 50%)", strokeWidth: 2 },
    },
  ];
  return layoutGraph(nodes, edges);
}
