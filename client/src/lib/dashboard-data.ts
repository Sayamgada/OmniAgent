export type IndustryId = "corporate" | "education" | "finance";
export type AgentStatus = "active" | "inactive";

export type Agent = {
  id: string;
  name: string;
  industry: IndustryId;
  role: string;
  status: AgentStatus;
  lastUsed: string;
  model: string;
  conversations: number;
};

export const mockAgents: Agent[] = [
  {
    id: "1",
    name: "HR Policy Assistant",
    industry: "corporate",
    role: "HR & Compliance",
    status: "active",
    lastUsed: "2 hours ago",
    model: "GPT-4o",
    conversations: 342,
  },
  {
    id: "2",
    name: "Meeting Coordinator",
    industry: "corporate",
    role: "Operations",
    status: "active",
    lastUsed: "5 hours ago",
    model: "Claude 3.5",
    conversations: 128,
  },
  {
    id: "3",
    name: "Quiz Generator",
    industry: "education",
    role: "Assessment",
    status: "active",
    lastUsed: "1 day ago",
    model: "GPT-4o",
    conversations: 89,
  },
  {
    id: "4",
    name: "Study Planner",
    industry: "education",
    role: "Learning Path",
    status: "inactive",
    lastUsed: "3 days ago",
    model: "Gemini 1.5",
    conversations: 56,
  },
  {
    id: "5",
    name: "Expense Analyzer",
    industry: "finance",
    role: "Financial Ops",
    status: "active",
    lastUsed: "30 min ago",
    model: "GPT-4o",
    conversations: 201,
  },
];

export const industryLabels: Record<IndustryId, string> = {
  corporate: "Corporate Operations",
  education: "Education",
  finance: "Finance",
};

export const industryColors: Record<IndustryId, string> = {
  corporate: "bg-primary/20 text-primary border-primary/30",
  education: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  finance: "bg-secondary/20 text-secondary border-secondary/30",
};
