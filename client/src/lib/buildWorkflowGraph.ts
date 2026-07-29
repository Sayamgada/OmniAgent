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

function inferNodeType(label: string, context: "step" | "tool" | "trigger" | "success" | "edge" | "orchestrator"): WorkflowNodeType {
  const lower = label.toLowerCase();
  if (context === "trigger") return "trigger";
  if (context === "orchestrator") return "orchestrator";
  if (context === "success") return "success";
  if (context === "edge") return "edge_case";
  if (context === "tool") return "tool";
  if (lower.includes("approval") || lower.includes("confirm") || lower.includes("user review")) {
    return "approval";
  }
  if (lower.includes("if ") || lower.includes("decide") || lower.includes("branch") || lower.includes("condition")) {
    return "decision";
  }
  return "agent";
}

function stepNodeDetail(step: WorkflowStep, config: AgentWorkflowConfig): WorkflowNodeDetail {
  const type = inferNodeType(step.description || step.agent || step.service || `Step ${step.step}`, "step");
  const label = step.agent || step.service || `Step ${step.step}`;
  return {
    id: `step-${step.step}`,
    type,
    label,
    subtitle: step.service ? `Service: ${step.service}` : undefined,
    preview: step.description || step.action,
    responsibilities: config.required_agents?.map((agent) => agent.agent_name),
    inputs: step.input ? [step.input] : config.inputs_required,
    outputs: step.output ? [step.output] : config.expected_outputs,
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
  const steps = [...(config.workflow ?? [])].sort((a, b) => a.step - b.step);
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
        subtitle: config.trigger_type ?? "Manual trigger",
        preview: config.task_summary ?? config.automation_description ?? "Workflow trigger",
        inputs: config.inputs_required,
        status: "ready",
        executionOrder: ++order,
      },
    },
  });

  let prevId = triggerId;

  steps.forEach((step) => {
    const stepId = `step-${step.step}`;
    nodes.push({
      id: stepId,
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: { detail: stepNodeDetail(step, config) },
    });
    link(prevId, stepId);
    prevId = stepId;
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
          subtitle: "Fallback path",
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
        subtitle: config.automation_name ?? "Workflow complete",
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
