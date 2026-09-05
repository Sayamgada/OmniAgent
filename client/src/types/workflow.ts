export type WorkflowNodeType =
  | "trigger"
  | "orchestrator"
  | "agent"
  | "tool"
  | "decision"
  | "approval"
  | "edge_case"
  | "success"
  | "output";

export interface RequiredAgent {
  agent_name: string;
  role: string;
  responsibilities: string[];
}

// Attached by _enrich_with_real_operations() in workflow_generator.py, not
// written by Groq. Mirrors the shape of node_registry.json's resolved
// operation entries - see workflow_generator.py's schema_version 3 comment.
export interface N8nOperationInfo {
  label: string;
  value: string;
  action: string;
  description?: string | null;
}

// A step's "condition" object (v4 schema) - present only on the step whose
// outcome forks the workflow. See workflow_generator.py's CONDITION /
// BRANCH section for the full spec this mirrors.
export interface StepCondition {
  branches: string[];
}

export interface WorkflowStep {
  step: number;
  description?: string;
  agent?: string;
  service?: string;
  // "action" no longer exists on backend steps as of the operation/target
  // schema (v3+) - parseWorkflow.ts derives it from n8n_operation.action
  // (or falls back to "operation") for legacy-consumer compatibility.
  // Prefer "operation"/"target"/"n8n_operation" directly in new code.
  action?: string;
  input?: string;
  output?: string;

  // v3 fields
  operation?: string;
  target?: string;
  parameters?: Record<string, unknown>;
  n8n_resolved?: boolean;
  n8n_operation?: N8nOperationInfo;

  // v4 fields
  depends_on?: number[];
  condition?: StepCondition;
  branch?: string;
}

export interface IntegrationStatusLike {
  service: string;
  display_name?: string;
  required?: boolean;
  available?: boolean;
}

export interface AgentWorkflowConfig {
  schema_version?: number;
  domain?: string;
  task_summary?: string;
  intent_type?: string;
  complexity?: "low" | "medium" | "high" | string;
  required_agents?: RequiredAgent[];
  workflow?: WorkflowStep[];
  inputs_required?: string[];
  expected_outputs?: string[];
  tools_required?: string[];
  constraints?: string[];
  tone?: string;
  frequency?: string;
  trigger_type?: string;
  edge_cases?: string[];
  success_criteria?: string[];
  automation_name?: string;
  automation_description?: string;
  required_integrations?: IntegrationStatusLike[];
  preview_json?: Record<string, unknown>;
}

export interface WorkflowNodeDetail {
  id: string;
  type: WorkflowNodeType;
  label: string;
  subtitle?: string;
  preview?: string;
  responsibilities?: string[];
  inputs?: string[];
  outputs?: string[];
  tools?: string[];
  constraints?: string[];
  executionOrder?: number;
  edgeCases?: string[];
  status?: "ready" | "pending" | "warning";

  // Carried through so buildWorkflowGraph.ts can render an actual fork
  // (decision/approval node types already exist in WorkflowNodeType and
  // nodeTypeStyles - they've just had no data path feeding them until now)
  // and so WorkflowNodeDetailPanel can show which branch a downstream step
  // belongs to.
  condition?: StepCondition;
  branch?: string;
}