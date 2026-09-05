import type { AgentWorkflowConfig, N8nOperationInfo } from "../types/workflow";

// function declarations are hoisted, so isRecord (defined below) is
// available here despite appearing after this in source order.
function isN8nOperationInfo(value: unknown): value is N8nOperationInfo {
  if (!isRecord(value)) return false;
  return (
    typeof value.label === "string" &&
    typeof value.value === "string" &&
    typeof value.action === "string"
  );
}

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

    const operation = typeof stepRecord.operation === "string" ? stepRecord.operation : undefined;
    const target = typeof stepRecord.target === "string" ? stepRecord.target : undefined;
    const service = typeof stepRecord.service === "string" ? stepRecord.service : undefined;
    const n8nOperation = isN8nOperationInfo(stepRecord.n8n_operation) ? stepRecord.n8n_operation : null;

    // "action" no longer exists on backend steps as of the operation/target
    // schema (v3+) - it's derived here for display/legacy-consumer
    // compatibility only. Prefer the real n8n operation's action label
    // (e.g. "Post a message") when a step has resolved against the node
    // registry; fall back to the bare universal verb otherwise so this is
    // never silently blank.
    const derivedAction =
      (n8nOperation && typeof n8nOperation.action === "string" ? n8nOperation.action : undefined) ??
      operation;

    return {
      step: Number.isFinite(numericStep) ? numericStep : index + 1,
      description: derivedAction,
      agent: service,
      service,
      action: derivedAction,
      input: "",
      output: "",

      // v3/v4 fields - previously dropped entirely by this mapper, which
      // meant operation/target/parameters/depends_on/condition/branch/
      // n8n_resolved/n8n_operation never reached the UI at all. Forwarded
      // verbatim (with type narrowing) so downstream consumers - the JSON
      // panel and buildWorkflowGraph - can actually see and use them.
      operation,
      target,
      parameters: isRecord(stepRecord.parameters) ? stepRecord.parameters : {},
      depends_on: Array.isArray(stepRecord.depends_on)
        ? stepRecord.depends_on.filter((n): n is number => typeof n === "number")
        : [],
      condition:
        isRecord(stepRecord.condition) && Array.isArray(stepRecord.condition.branches)
          ? { branches: stepRecord.condition.branches.filter((b): b is string => typeof b === "string") }
          : undefined,
      branch: typeof stepRecord.branch === "string" ? stepRecord.branch : undefined,
      n8n_resolved: typeof stepRecord.n8n_resolved === "boolean" ? stepRecord.n8n_resolved : undefined,
      n8n_operation: n8nOperation ?? undefined,
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

  // Approval/decision automations should be visibly flagged as such even
  // in the legacy "complexity" bucket UI - a 3-step linear automation and
  // a 3-step automation with a branch are not equally complex to actually
  // run correctly, even though step count alone can't tell them apart.
  const hasBranching = steps.some((step) => step.condition !== undefined);
  const complexity = hasBranching
    ? "high"
    : steps.length > 5
    ? "high"
    : steps.length > 2
    ? "medium"
    : "low";

  return {
    automation_name: automationName,
    automation_description: automationDescription,
    domain: typeof payload.domain === "string" ? payload.domain : undefined,
    // schema_version is forwarded (not present on pre-v2 cached documents,
    // hence optional) so any future consumer can branch on it without
    // re-deriving shape from field presence, same pattern the backend
    // already uses in agent_router.py / workflow_generator.py.
    schema_version: typeof payload.schema_version === "number" ? payload.schema_version : undefined,
    task_summary: typeof previewJson.description === "string"
      ? previewJson.description
      : automationDescription,
    intent_type: "automation_preview",
    complexity,
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
    // config is always null here - referencing it via optional chaining
    // (as the previous version did) is what triggers the 'never' narrowing
    // TypeScript complains about. Return static zeros instead.
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