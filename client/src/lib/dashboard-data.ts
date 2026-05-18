import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  FileText,
  MessageSquare,
  Workflow,
  Zap,
} from "lucide-react";

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

export type StatItem = {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  trend: number;
  trendLabel: string;
  icon: LucideIcon;
};

export type IndustryStat = {
  id: IndustryId;
  label: string;
  agents: number;
  percentage: number;
  trend: number;
  color: string;
};

export type Integration = {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  category: string;
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

export const dashboardStats: StatItem[] = [
  {
    id: "agents",
    label: "Total Agents",
    value: 8,
    trend: 12,
    trendLabel: "vs last month",
    icon: Bot,
  },
  {
    id: "workflows",
    label: "Active Workflows",
    value: 14,
    trend: 8,
    trendLabel: "vs last month",
    icon: Workflow,
  },
  {
    id: "messages",
    label: "Messages Processed",
    value: 24800,
    suffix: "",
    trend: 24,
    trendLabel: "vs last month",
    icon: MessageSquare,
  },
  {
    id: "documents",
    label: "Documents Indexed",
    value: 1240,
    trend: 5,
    trendLabel: "vs last month",
    icon: FileText,
  },
  {
    id: "api",
    label: "API Usage",
    value: 86,
    suffix: "%",
    trend: -3,
    trendLabel: "of quota",
    icon: Zap,
  },
  {
    id: "success",
    label: "Success Rate",
    value: 98.4,
    suffix: "%",
    trend: 1.2,
    trendLabel: "vs last month",
    icon: Activity,
  },
];

export const industryStats: IndustryStat[] = [
  {
    id: "corporate",
    label: "Corporate Operations",
    agents: 4,
    percentage: 50,
    trend: 8,
    color: "hsl(211 100% 50%)",
  },
  {
    id: "education",
    label: "Education",
    agents: 2,
    percentage: 25,
    trend: 12,
    color: "hsl(270 70% 60%)",
  },
  {
    id: "finance",
    label: "Finance",
    agents: 2,
    percentage: 25,
    trend: 5,
    color: "hsl(122 39% 49%)",
  },
];

export const integrations: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Sync emails and automate inbox workflows",
    connected: true,
    category: "Communication",
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description: "Schedule meetings and manage availability",
    connected: true,
    category: "Productivity",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Deploy agents in team channels",
    connected: false,
    category: "Communication",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Index knowledge bases and documents",
    connected: false,
    category: "Knowledge",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Connect GPT models for agent inference",
    connected: true,
    category: "AI Provider",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Connect Claude models for agent inference",
    connected: false,
    category: "AI Provider",
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
