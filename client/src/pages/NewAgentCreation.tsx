import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  GraduationCap,
  Landmark,
  Loader2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { WorkflowReviewStep } from "../components/workflow/WorkflowReviewStep";
import { toast } from "sonner";

type DomainId = "corporate" | "education" | "finance";

type DomainOption = {
  id: DomainId;
  title: string;
  label: string;
  description: string;
  badge: string;
  icon: typeof Briefcase;
  hint: string;
  stats: { agents: string; workflows: string };
};

const domains: DomainOption[] = [
  {
    id: "corporate",
    title: "Corporate Operations",
    label: "Corporate Operations",
    badge: "Enterprise",
    description: "Enterprise operations, HR lifecycle, compliance, executive reporting, and cross-team knowledge workflows.",
    icon: Briefcase,
    hint: "Optimal for SLA governance, role permissions, and compliance guardrails.",
    stats: { agents: "4 Agents", workflows: "12 Flows" },
  },
  {
    id: "education",
    title: "Education & Research",
    label: "Education & Research",
    badge: "Academic",
    description: "Curriculum pacing, intelligent quiz generation, rubric grading assistance, and student research retrieval.",
    icon: GraduationCap,
    hint: "Configured with academic citations and factual grounding thresholds.",
    stats: { agents: "2 Agents", workflows: "5 Flows" },
  },
  {
    id: "finance",
    title: "Financial Services",
    label: "Financial Services",
    badge: "Audit-Ready",
    description: "Expense auditing, ledger reconciliation, anomaly detection, and automated variance analysis.",
    icon: Landmark,
    hint: "Hardened with numeric validation and deterministic calculation modules.",
    stats: { agents: "2 Agents", workflows: "7 Flows" },
  },
];

const promptTemplates = [
  {
    title: "HR Policy Assistant",
    prompt:
      "Draft an internal policy assistant that answers employee questions regarding leave, remote work policies, and travel expenses using verified internal Notion knowledge bases.",
  },
  {
    title: "Executive Meeting Briefing",
    prompt:
      "Synthesize upcoming Google Calendar meetings, extract attendees and recent email threads from Gmail, and generate concise 3-bullet prep briefing docs.",
  },
  {
    title: "Expense Anomaly Scanner",
    prompt:
      "Parse incoming invoice PDF attachments, verify itemized totals against policy limits, and trigger a Slack approval message for line items exceeding $500.",
  },
];

const stepMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

export default function NewAgentCreation() {
  const { token, user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDomain, setSelectedDomain] = useState<DomainId>("corporate");
  const [agentName, setAgentName] = useState("Omni Assistant");
  const [description, setDescription] = useState(
    "Create an AI assistant that helps draft professional emails and schedule meetings with clear priorities."
  );

  const [workflow, setWorkflow] = useState<Record<string, unknown> | null>(null);
  const [integrations, setIntegrations] = useState<
    { service: string; display_name: string; required: boolean; available: boolean }[]
  >([]);
  const [generating, setGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const activeDomain = useMemo(
    () => domains.find((domain) => domain.id === selectedDomain) ?? domains[0],
    [selectedDomain]
  );

  const domainMap: Record<DomainId, "Corporate" | "Education" | "Finance"> = {
    corporate: "Corporate",
    education: "Education",
    finance: "Finance",
  };

  const displayName = user?.full_name || user?.name || user?.email?.split("@")[0] || "User";

  const handleStepTwoContinue = async () => {
    if (!agentName.trim()) {
      toast.error("Please enter an agent name");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter an agent description");
      return;
    }

    setStep(3);
    setWorkflow(null);
    setIntegrations([]);
    setGenerating(true);
    setCreated(false);

    try {
      const res = await fetch(`http://localhost:8000/agents/extract-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          domain: domainMap[selectedDomain],
          description: `Agent Name: ${agentName}\n${description}`,
          top_k: 5,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to generate AI output");
      }

      const data: {
        workflow: Record<string, unknown>;
        integrations: {
          service: string;
          display_name: string;
          required: boolean;
          available: boolean;
        }[];
        all_required_available: boolean;
      } = await res.json();

      setWorkflow(data.workflow);
      setIntegrations(data.integrations);

      toast.success("AI output generated successfully");
    } catch (err: any) {
      setWorkflow(null);
      setIntegrations([]);
      toast.error(err.message || "Failed to generate AI output");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!workflow) {
      toast.error("No workflow IR schema available to compile");
      return;
    }

    setIsCreating(true);

    try {
      const res = await fetch(`http://localhost:8000/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: agentName.trim() || "Untitled Agent",
          description: description.trim() || undefined,
          ir_schema: workflow,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create and compile agent");
      }

      const createdAgent = await res.json();
      setCreated(true);
      toast.success(
        `Agent "${createdAgent.name}" compiled and deployed successfully! (ID: ${createdAgent.n8n_workflow_id || createdAgent.id})`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to create and deploy agent");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Precision ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-primary/8 rounded-full blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 border border-primary/30 text-primary">
                <Bot className="size-3.5" />
              </div>
              <span className="text-xs font-bold text-foreground">Agent Creator</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline font-medium text-foreground">{displayName}</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 pb-16 pt-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Create AI Agent
            </h1>
            <p className="text-xs text-muted-foreground">
              Define domain objectives, compile multi-agent workflow, and inspect execution topology
            </p>
          </div>
        </div>

        {/* Sequential Step Progress Bar */}
        <div className="mb-6 rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, label: "Select Domain" },
              { num: 2, label: "Describe Agent" },
              { num: 3, label: "Inspect & Deploy" },
            ].map((s, idx) => {
              const isDone = s.num < step;
              const isCurrent = s.num === step;

              return (
                <div key={s.num} className="flex items-center gap-2 sm:gap-3 flex-1 last:flex-none">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg text-xs font-bold transition-all",
                        isDone && "bg-secondary/15 border border-secondary/40 text-secondary",
                        isCurrent && "bg-primary text-primary-foreground font-semibold shadow-[0_0_12px_hsl(var(--primary)/0.3)]",
                        !isDone && !isCurrent && "border border-border bg-muted/40 text-muted-foreground"
                      )}
                    >
                      {isDone ? <Check className="size-3.5" /> : s.num}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium hidden sm:inline",
                        isCurrent ? "text-foreground font-bold" : "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < 2 && <div className="h-px flex-1 bg-border mx-2 hidden sm:block" />}
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section key="step-1" {...stepMotion}>
              <Card className="border-border bg-card">
                <CardContent className="space-y-5 p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-foreground">Select Industry Domain</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Anchors domain-specific knowledge, tools, and regulatory constraints
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                      Step 1 of 3
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {domains.map((domain) => {
                      const Icon = domain.icon;
                      const isSelected = domain.id === selectedDomain;

                      return (
                        <button
                          key={domain.id}
                          type="button"
                          onClick={() => setSelectedDomain(domain.id)}
                          className={cn(
                            "rounded-xl border p-4 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.15)] ring-1 ring-primary"
                              : "border-border bg-background/50 hover:border-border/80 hover:bg-card"
                          )}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-card">
                              <Icon className="size-4 text-primary" />
                            </div>
                            {isSelected && <CheckCircle2 className="size-4 text-primary" />}
                          </div>
                          <h3 className="text-xs font-bold text-foreground">{domain.title}</h3>
                          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                            {domain.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section key="step-2" {...stepMotion}>
              <div className="grid gap-5 lg:grid-cols-5">
                <Card className="border-border bg-card lg:col-span-3">
                  <CardContent className="space-y-4 p-5 sm:p-6 text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-foreground">Describe Your Agent</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          State desired capabilities and tools in plain language
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                        Step 2 of 3
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="agent-name" className="text-xs font-medium text-foreground">
                        Agent Name
                      </Label>
                      <Input
                        id="agent-name"
                        value={agentName}
                        onChange={(event) => setAgentName(event.target.value)}
                        className="h-10 border-border bg-background/60 text-xs focus-visible:ring-primary"
                        placeholder="e.g. Omni Ops Assistant"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="agent-description" className="text-xs font-medium text-foreground">
                        Agent Objective & Prompt
                      </Label>
                      <Textarea
                        id="agent-description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        className="min-h-[160px] border-border bg-background/60 text-xs leading-relaxed focus-visible:ring-primary"
                        placeholder="Describe what the agent should accomplish..."
                      />
                      <p className="text-[11px] text-primary/90 font-medium">{activeDomain.hint}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card lg:col-span-2">
                  <CardContent className="space-y-3 p-5 text-left">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="size-4 text-primary" />
                      <h3 className="text-xs font-bold text-foreground">Prompt Blueprints</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Click a blueprint template to populate your prompt
                    </p>
                    <div className="space-y-2 pt-1">
                      {promptTemplates.map((template) => (
                        <button
                          key={template.title}
                          type="button"
                          onClick={() => setDescription(template.prompt)}
                          className="w-full rounded-lg border border-border bg-background/50 p-3 text-left transition-colors hover:border-primary/50 hover:bg-card"
                        >
                          <p className="text-xs font-bold text-foreground">{template.title}</p>
                          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground leading-relaxed">
                            {template.prompt}
                          </p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section key="step-3" {...stepMotion}>
              <Card className="border-border bg-card">
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h2 className="text-base font-bold text-foreground">Inspect & Deploy Agent</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Verify intermediate schema, node connections, and deploy to runtime
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] text-secondary border-secondary/30">
                      Step 3 of 3
                    </Badge>
                  </div>

                  <WorkflowReviewStep
                    workflow={workflow}
                    integrations={integrations}
                    generating={generating}
                  />
                </CardContent>
              </Card>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Persistent Bottom Bar */}
        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {created ? "Agent compiled and deployed successfully." : "Parameters saved in session state."}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((prev) => (prev === 3 ? 2 : 1))}
              disabled={step === 1 || isCreating || generating}
              className="h-9 border-border bg-card text-xs text-foreground hover:bg-muted"
            >
              Back
            </Button>

            {step === 1 && (
              <Button
                size="sm"
                onClick={() => setStep(2)}
                className="h-9 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary"
              >
                Continue
              </Button>
            )}

            {step === 2 && (
              <Button
                size="sm"
                onClick={handleStepTwoContinue}
                disabled={generating}
                className="h-9 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    Compiling Architecture…
                  </>
                ) : (
                  "Compile Workflow"
                )}
              </Button>
            )}

            {step === 3 && (
              <Button
                size="sm"
                onClick={handleCreateAgent}
                disabled={isCreating || created || generating || !workflow}
                className={cn(
                  "h-9 min-w-32 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90",
                  !created && !isCreating && "glow-primary"
                )}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    Deploying Runtime…
                  </>
                ) : created ? (
                  <>
                    <CheckCircle2 className="mr-2 size-3.5 text-secondary" />
                    Deployed
                  </>
                ) : (
                  "Deploy Agent"
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
