import type { Agent, IndustryId } from "./dashboard-data";
import { mockAgents } from "./dashboard-data";

export type PipelineNodeChange = "unchanged" | "added" | "removed" | "modified";

export type PipelineNode = {
  id: string;
  label: string;
  change?: PipelineNodeChange;
};

export type AgentVersion = {
  version: string;
  date: string;
  summary: string;
};

export type AgentEditDetail = Agent & {
  category: string;
  description: string;
  createdAt: string;
  lastModified: string;
  version: string;
  automationType: string;
  primaryGoal: string;
  connectedWorkflow: string;
  knowledgeSource: string;
  memoryEnabled: boolean;
  integrations: string[];
  currentWorkflow: PipelineNode[];
  versions: AgentVersion[];
};

const baseWorkflow: PipelineNode[] = [
  { id: "user-input", label: "User Input" },
  { id: "prompt-parser", label: "Prompt Parser" },
  { id: "knowledge-base", label: "Knowledge Base" },
  { id: "decision-engine", label: "Decision Engine" },
  { id: "response-generator", label: "Response Generator" },
  { id: "n8n-automation", label: "n8n Automation" },
  { id: "output", label: "Output" },
];

const agentDetails: Record<string, Omit<AgentEditDetail, keyof Agent> & { id: string }> = {
  "1": {
    id: "1",
    category: "HR & Compliance",
    description:
      "Answers employee HR policy questions and assists with internal compliance guidance.",
    createdAt: "10 June 2026",
    lastModified: "Today",
    version: "2.1",
    automationType: "Conversational Q&A",
    primaryGoal: "Policy guidance & compliance support",
    connectedWorkflow: "HR Policy Pipeline",
    knowledgeSource: "Employee Handbook.pdf",
    memoryEnabled: true,
    integrations: ["n8n"],
    currentWorkflow: baseWorkflow,
    versions: [
      { version: "2.1", date: "Today", summary: "Updated workflow" },
      { version: "2.0", date: "12 June", summary: "Added HR Knowledge Base" },
      { version: "1.0", date: "10 June", summary: "Initial Creation" },
    ],
  },
  "2": {
    id: "2",
    category: "Operations",
    description:
      "Coordinates meetings, resolves scheduling conflicts, and sends calendar invites across teams.",
    createdAt: "8 June 2026",
    lastModified: "Yesterday",
    version: "1.4",
    automationType: "Scheduling Automation",
    primaryGoal: "Meeting coordination",
    connectedWorkflow: "Meeting Orchestrator",
    knowledgeSource: "Team Calendar Sync",
    memoryEnabled: true,
    integrations: ["Google Calendar", "Gmail"],
    currentWorkflow: [
      { id: "user-input", label: "User Input" },
      { id: "intent-router", label: "Intent Router" },
      { id: "calendar-lookup", label: "Calendar Lookup" },
      { id: "conflict-resolver", label: "Conflict Resolver" },
      { id: "invite-sender", label: "Invite Sender" },
      { id: "output", label: "Output" },
    ],
    versions: [
      { version: "1.4", date: "Yesterday", summary: "Improved conflict resolution" },
      { version: "1.0", date: "8 June", summary: "Initial Creation" },
    ],
  },
  "3": {
    id: "3",
    category: "Assessment",
    description:
      "Generates quizzes from curriculum content and adapts difficulty based on student performance.",
    createdAt: "5 June 2026",
    lastModified: "1 day ago",
    version: "1.2",
    automationType: "Content Generation",
    primaryGoal: "Adaptive quiz creation",
    connectedWorkflow: "Quiz Builder Pipeline",
    knowledgeSource: "Curriculum Pack.pdf",
    memoryEnabled: false,
    integrations: ["Notion"],
    currentWorkflow: [
      { id: "user-input", label: "Topic Input" },
      { id: "content-parser", label: "Content Parser" },
      { id: "question-generator", label: "Question Generator" },
      { id: "difficulty-tuner", label: "Difficulty Tuner" },
      { id: "output", label: "Quiz Export" },
    ],
    versions: [
      { version: "1.2", date: "1 day ago", summary: "Added difficulty tuning" },
      { version: "1.0", date: "5 June", summary: "Initial Creation" },
    ],
  },
  "4": {
    id: "4",
    category: "Learning Path",
    description:
      "Builds personalized study schedules and tracks weekly learning goals for students.",
    createdAt: "2 June 2026",
    lastModified: "3 days ago",
    version: "1.0",
    automationType: "Planning Assistant",
    primaryGoal: "Personalized study plans",
    connectedWorkflow: "Study Planner Flow",
    knowledgeSource: "Syllabus Index",
    memoryEnabled: true,
    integrations: [],
    currentWorkflow: baseWorkflow.slice(0, 5).concat([{ id: "output", label: "Output" }]),
    versions: [
      { version: "1.0", date: "2 June", summary: "Initial Creation" },
    ],
  },
  "5": {
    id: "5",
    category: "Financial Ops",
    description:
      "Reviews expense reports, flags anomalies, and produces executive-ready finance summaries.",
    createdAt: "9 June 2026",
    lastModified: "30 min ago",
    version: "2.0",
    automationType: "Analytics Pipeline",
    primaryGoal: "Expense anomaly detection",
    connectedWorkflow: "Expense Analyzer",
    knowledgeSource: "Finance Ledger.csv",
    memoryEnabled: false,
    integrations: ["n8n", "Gmail"],
    currentWorkflow: [
      { id: "user-input", label: "Report Upload" },
      { id: "data-parser", label: "Data Parser" },
      { id: "anomaly-detector", label: "Anomaly Detector" },
      { id: "summary-engine", label: "Summary Engine" },
      { id: "n8n-alert", label: "n8n Alert" },
      { id: "output", label: "Report Output" },
    ],
    versions: [
      { version: "2.0", date: "30 min ago", summary: "Added anomaly alerts" },
      { version: "1.0", date: "9 June", summary: "Initial Creation" },
    ],
  },
};

const defaultsByIndustry: Record<
  IndustryId,
  Omit<AgentEditDetail, keyof Agent>
> = {
  corporate: {
    category: "Operations",
    description: "Assists with corporate workflows and internal operations.",
    createdAt: "1 June 2026",
    lastModified: "Recently",
    version: "1.0",
    automationType: "Conversational Automation",
    primaryGoal: "Streamline operations",
    connectedWorkflow: "Default Pipeline",
    knowledgeSource: "Company Knowledge Base",
    memoryEnabled: false,
    integrations: ["n8n"],
    currentWorkflow: baseWorkflow,
    versions: [{ version: "1.0", date: "1 June", summary: "Initial Creation" }],
  },
  education: {
    category: "Learning",
    description: "Supports education workflows and student engagement.",
    createdAt: "1 June 2026",
    lastModified: "Recently",
    version: "1.0",
    automationType: "Learning Assistant",
    primaryGoal: "Improve learning outcomes",
    connectedWorkflow: "Education Pipeline",
    knowledgeSource: "Curriculum Index",
    memoryEnabled: false,
    integrations: [],
    currentWorkflow: baseWorkflow,
    versions: [{ version: "1.0", date: "1 June", summary: "Initial Creation" }],
  },
  finance: {
    category: "Finance",
    description: "Analyzes financial data and surfaces actionable insights.",
    createdAt: "1 June 2026",
    lastModified: "Recently",
    version: "1.0",
    automationType: "Analytics Pipeline",
    primaryGoal: "Financial clarity",
    connectedWorkflow: "Finance Pipeline",
    knowledgeSource: "Finance Documents",
    memoryEnabled: false,
    integrations: ["n8n"],
    currentWorkflow: baseWorkflow,
    versions: [{ version: "1.0", date: "1 June", summary: "Initial Creation" }],
  },
};

export const suggestionChips = [
  "Add Memory",
  "Enable PDF Upload",
  "Connect Slack",
  "Improve Response Accuracy",
  "Enable Audit Logs",
  "Add Email Notifications",
  "Add FAQ Retrieval",
] as const;

export function getAgentEditDetail(id: string): AgentEditDetail | null {
  const agent = mockAgents.find((a) => a.id === id);
  if (!agent) return null;

  const extra = agentDetails[id] ?? {
    id: agent.id,
    ...defaultsByIndustry[agent.industry],
  };

  return { ...agent, ...extra };
}

/** Builds a demos-style updated pipeline from change request keywords. */
export function buildUpdatedWorkflow(
  current: PipelineNode[],
  changeRequest: string
): { nodes: PipelineNode[]; summary: string } {
  const text = changeRequest.toLowerCase();
  const nodes: PipelineNode[] = current.map((n) => ({
    ...n,
    change: "unchanged" as const,
  }));

  const additions: { label: string; afterId?: string; keywords: string[] }[] = [
    {
      label: "Email Notification",
      afterId: "response-generator",
      keywords: ["email", "notification", "notify"],
    },
    {
      label: "Slack Integration",
      afterId: "email-notification",
      keywords: ["slack"],
    },
    {
      label: "PDF Document Parser",
      afterId: "prompt-parser",
      keywords: ["pdf", "document upload", "document support"],
    },
    {
      label: "Memory Store",
      afterId: "knowledge-base",
      keywords: ["memory"],
    },
    {
      label: "Approval Gate",
      afterId: "decision-engine",
      keywords: ["approval", "approve"],
    },
    {
      label: "Audit Logger",
      afterId: "n8n-automation",
      keywords: ["audit"],
    },
    {
      label: "FAQ Retriever",
      afterId: "knowledge-base",
      keywords: ["faq", "accuracy", "retrieval"],
    },
  ];

  const inserted: string[] = [];
  let modifiedLlm = false;

  for (const addition of additions) {
    if (!addition.keywords.some((k) => text.includes(k))) continue;
    const id = addition.label.toLowerCase().replace(/\s+/g, "-");
    if (nodes.some((n) => n.id === id)) continue;

    let insertAt = nodes.findIndex((n) => n.id === "output");
    if (insertAt < 0) insertAt = nodes.length;

    if (addition.afterId) {
      const afterIdx = nodes.findIndex((n) => n.id === addition.afterId);
      if (afterIdx >= 0) insertAt = afterIdx + 1;
    }

    nodes.splice(insertAt, 0, {
      id,
      label: addition.label,
      change: "added",
    });
    inserted.push(addition.label);
  }

  if (
    text.includes("claude") ||
    text.includes("gpt") ||
    text.includes("model") ||
    text.includes("shorter") ||
    text.includes("response")
  ) {
    const response = nodes.find(
      (n) =>
        n.id === "response-generator" ||
        n.label.toLowerCase().includes("response") ||
        n.label.toLowerCase().includes("summary")
    );
    if (response) {
      response.change = "modified";
      modifiedLlm = true;
    }
  }

  if (inserted.length === 0 && !modifiedLlm) {
    const mid = Math.max(1, Math.floor(nodes.length / 2));
    nodes.splice(mid, 0, {
      id: "refinement-layer",
      label: "Refinement Layer",
      change: "added",
    });
    inserted.push("Refinement Layer");
  }

  const parts: string[] = [];
  if (inserted.length) {
    parts.push(
      `inserted ${inserted.map((l) => `a ${l} node`).join(", ")} into the pipeline`
    );
  }
  if (modifiedLlm) {
    parts.push("updated the response generation stage to reflect your model and tone preferences");
  }
  parts.push("preserving all existing retrieval and orchestration logic");

  const summary = `Based on your request, OmniAgent ${parts.join(", while ")}.`;

  return { nodes, summary };
}
