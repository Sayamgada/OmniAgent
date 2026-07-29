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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeWorkflowPayload(payload: unknown): AgentWorkflowConfig | null {
  if (!isRecord(payload)) return null;

  const previewJson = isRecord(payload.preview_json) ? payload.preview_json : null;
  const workflowArray = previewJson && Array.isArray(previewJson.workflow) ? previewJson.workflow : null;

  if (!previewJson || !workflowArray) {
    return payload as AgentWorkflowConfig;
  }

  const steps = workflowArray.map((step, index) => {
    const stepRecord = isRecord(step) ? step : {};
    const numericStep = Number(stepRecord.step ?? index + 1);
    return {
      step: Number.isFinite(numericStep) ? numericStep : index + 1,
      description: typeof stepRecord.action === "string" ? stepRecord.action : undefined,
      agent: typeof stepRecord.service === "string" ? stepRecord.service : undefined,
      service: typeof stepRecord.service === "string" ? stepRecord.service : undefined,
      action: typeof stepRecord.action === "string" ? stepRecord.action : undefined,
      input: "",
      output: "",
    };
  });

  const requiredIntegrations = Array.isArray(payload.required_integrations)
    ? payload.required_integrations
        .filter((item): item is Record<string, unknown> => isRecord(item))
        .map((item) => ({
          service: typeof item.service === "string" ? item.service : "",
          display_name: typeof item.display_name === "string" ? item.display_name : undefined,
          required: typeof item.required === "boolean" ? item.required : true,
          available: typeof item.available === "boolean" ? item.available : true,
        }))
    : [];

  const toolsRequired = requiredIntegrations.reduce<string[]>((acc, integration) => {
    const service = integration.service?.trim();
    const displayName = integration.display_name?.trim();

    if (service && !acc.includes(service)) {
      acc.push(service);
    }

    if (displayName && displayName !== service && !acc.includes(displayName)) {
      acc.push(displayName);
    }

    return acc;
  }, []);

  const triggerInfo = isRecord(previewJson.trigger) ? previewJson.trigger : undefined;
  const automationName = typeof payload.automation_name === "string" ? payload.automation_name : undefined;
  const automationDescription = typeof payload.automation_description === "string" ? payload.automation_description : undefined;

  return {
    automation_name: automationName,
    automation_description: automationDescription,
    domain: typeof payload.domain === "string" ? payload.domain : undefined,
    task_summary: typeof previewJson.description === "string"
      ? previewJson.description
      : automationDescription,
    intent_type: "automation_preview",
    complexity: steps.length > 5 ? "high" : steps.length > 2 ? "medium" : "low",
    required_agents: steps.map((step) => ({
      agent_name: step.agent ?? `Step ${step.step}`,
      role: "Workflow step",
      responsibilities: step.description ? [step.description] : [],
    })),
    workflow: steps,
    inputs_required: [],
    expected_outputs: typeof previewJson.output === "string" ? [previewJson.output] : [],
    tools_required: toolsRequired,
    constraints: [],
    trigger_type: typeof triggerInfo?.type === "string" ? triggerInfo.type : undefined,
    edge_cases: [],
    success_criteria: typeof previewJson.output === "string" ? [previewJson.output] : [],
    required_integrations: requiredIntegrations,
    preview_json: previewJson,
  };
}

export function parseWorkflowResponse(raw: string): ParsedWorkflow {
  const cleaned = stripMarkdownFence(raw);

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    const config = normalizeWorkflowPayload(parsed) ?? (parsed as AgentWorkflowConfig);
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
      agentCount: config?.required_agents?.length ?? 0,
      toolCount: config?.tools_required?.length ?? 0,
      stepCount: config?.workflow?.length ?? 0,
    };
  }

  return {
    complexity: config.complexity ?? "—",
    agentCount: config.required_agents?.length ?? 0,
    toolCount: config.tools_required?.length ?? 0,
    stepCount: config.workflow?.length ?? 0,
  };
}

export function wrapWorkflowConfig(config: AgentWorkflowConfig | Record<string, unknown> | null): ParsedWorkflow {
  if (!config) {
    return {
      config: null,
      formattedJson: "",
      raw: "",
      isValidJson: false,
    };
  }

  const normalized = normalizeWorkflowPayload(config) ?? (config as AgentWorkflowConfig);
  const formatted = JSON.stringify(normalized, null, 2);
  return {
    config: normalized,
    formattedJson: formatted,
    raw: formatted,
    isValidJson: true,
  };
}