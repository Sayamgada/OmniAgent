import type { AgentWorkflowConfig } from "../types/workflow";

export interface ParsedWorkflow {
  config: AgentWorkflowConfig | null;
  formattedJson: string;
  raw: string;
  isValidJson: boolean;
}

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

export function parseWorkflowResponse(raw: string): ParsedWorkflow {
  const cleaned = stripMarkdownFence(raw);

  try {
    const config = JSON.parse(cleaned) as AgentWorkflowConfig;
    return {
      config,
      formattedJson: JSON.stringify(config, null, 2),
      raw,
      isValidJson: true,
    };
  } catch {
    return {
      config: null,
      formattedJson: cleaned,
      raw,
      isValidJson: false,
    };
  }
}

export function getWorkflowMetrics(config: AgentWorkflowConfig | null) {
  if (!config) {
    return {
      complexity: "—",
      agentCount: 0,
      toolCount: 0,
      stepCount: 0,
    };
  }

  return {
    complexity: config.complexity ?? "—",
    agentCount: config.required_agents?.length ?? 0,
    toolCount: config.tools_required?.length ?? 0,
    stepCount: config.workflow?.length ?? 0,
  };
}
