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

export interface WorkflowStep {
  step: number;
  description?: string;
  agent?: string;
  service?: string;
  action?: string;
  input?: string;
  output?: string;
}

export interface IntegrationStatusLike {
  service: string;
  display_name?: string;
  required?: boolean;
  available?: boolean;
}

export interface AgentWorkflowConfig {
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
}
