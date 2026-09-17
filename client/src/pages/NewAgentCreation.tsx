import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  Cpu,
  GraduationCap,
  Landmark,
  Layers,
  Loader2,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { WorkflowReviewStep } from "../components/workflow/WorkflowReviewStep";

type DomainId = "corporate" | "education" | "finance";

type DomainOption = {
  id: DomainId;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: typeof Briefcase;
  hint: string;
  guardrails: string;
  stats: { agents: string; workflows: string };
};

const domains: DomainOption[] = [
  {
    id: "corporate",
    title: "Corporate Operations",
    badge: "Enterprise",
    badgeColor: "text-primary border-primary/30 bg-primary/10",
    description: "Enterprise lifecycle, cross-department scheduling, policy compliance, and executive briefing workflows.",
    icon: Briefcase,
    hint: "Configured with strict SLA governance, role permissions, and verified Notion/Postgres knowledge anchors.",
    guardrails: "Role-based ACL · SOC2 Isolation · Deterministic Routing",
    stats: { agents: "4 Agents", workflows: "12 Flows" },
  },
  {
    id: "education",
    title: "Education & Research",
    badge: "Academic",
    badgeColor: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    description: "Curriculum pacing, adaptive quiz generation, pedagogical feedback, and student research retrieval.",
    icon: GraduationCap,
    hint: "Hardened with academic citation verification, standard rubrics, and factual grounding thresholds.",
    guardrails: "Citation Grounding · Pedagogy Framework · Hallucination Filter",
    stats: { agents: "2 Agents", workflows: "5 Flows" },
  },
  {
    id: "finance",
    title: "Financial Services",
    badge: "Audit-Ready",
    badgeColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    description: "Expense auditing, ledger reconciliation, anomaly detection, and automated variance analysis.",
    icon: Landmark,
    hint: "Hardened with numeric validation, policy ceiling triggers, and immutable audit log formatting.",
    guardrails: "Numeric Assertions · Strict Thresholds · Audit Trail",
    stats: { agents: "2 Agents", workflows: "7 Flows" },
  },
];

const promptTemplates = [
  {
    title: "HR Policy & Leave Coordinator",
    prompt:
      "Draft an internal policy assistant that parses employee leave requests, verifies PTO quotas against verified Notion policies, and schedules Google Calendar invites.",
  },
  {
    title: "Executive Meeting Briefing Synthesizer",
    prompt:
      "Synthesize upcoming Google Calendar meetings, extract attendee email threads from Gmail, and generate concise 3-bullet prep briefing docs.",
  },
  {
    title: "Expense Anomaly Scanner & Slack Escalation",
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
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDomain, setSelectedDomain] = useState<DomainId>("corporate");
  const [agentName, setAgentName] = useState("Operations Policy Assistant");
  const [description, setDescription] = useState(
    "Create an AI assistant that helps draft professional emails and schedule meetings with clear priorities based on internal guidelines."
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

      toast.success("AI Workflow IR compiled successfully");
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
        throw new Error(errorData.detail || "Failed to compile and deploy agent");
      }

      const createdAgent = await res.json();
      setCreated(true);
      toast.success(
        `Agent "${createdAgent.name}" compiled and deployed successfully to runtime!`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to create and deploy agent");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground text-left antialiased">
      {/* Precision ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[750px] h-[320px] bg-primary/8 rounded-full blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      {/* Studio Header */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-2xl">
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
              <span className="text-xs font-bold text-foreground">Agent Construction Studio</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] text-muted-foreground">{displayName}</span>
          </div>
        </div>
      </header>

      {/* Main Studio Work Area */}
      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 pb-20 pt-6">
        {/* Title */}
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Agent Construction <span className="gradient-text">Studio</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Anchor industry domain intelligence, compose target intent, and verify the compiled execution graph.
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30 self-start sm:self-auto">
            Compiler v2.4
          </Badge>
        </div>

        {/* Studio Step Progress Indicator */}
        <div className="mb-6 rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {[
              { num: 1, label: "Domain Intelligence", desc: "Anchor Schema Rules" },
              { num: 2, label: "Intent & Prompting", desc: "State Objective" },
              { num: 3, label: "IR & Topology Review", desc: "Inspect & Deploy" },
            ].map((s, idx) => {
              const isDone = s.num < step;
              const isCurrent = s.num === step;

              return (
                <div key={s.num} className="flex items-center gap-2 sm:gap-3 flex-1 last:flex-none">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-xl text-xs font-bold transition-all shrink-0",
                        isDone && "bg-secondary/15 border border-secondary/40 text-secondary",
                        isCurrent && "bg-primary text-primary-foreground font-extrabold shadow-[0_0_16px_hsl(var(--primary)/0.35)]",
                        !isDone && !isCurrent && "border border-border bg-muted/40 text-muted-foreground"
                      )}
                    >
                      {isDone ? <Check className="size-4" /> : `0${s.num}`}
                    </div>
                    <div className="hidden sm:block">
                      <p className={cn("text-xs font-bold", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                        {s.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">{s.desc}</p>
                    </div>
                  </div>
                  {idx < 2 && <div className="h-px flex-1 bg-border/80 mx-3 hidden sm:block" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Views */}
        <AnimatePresence mode="wait">
          {/* STEP 1: DOMAIN SELECTION */}
          {step === 1 && (
            <motion.section key="step-1" {...stepMotion}>
              <Card className="border-border/80 bg-card rounded-2xl shadow-xl">
                <CardContent className="space-y-6 p-5 sm:p-7">
                  <div className="flex items-center justify-between border-b border-border/70 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-foreground">Select Operational Domain</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Anchors domain-specific knowledge, tools, and regulatory policy boundaries
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                      Step 1 of 3
                    </Badge>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {domains.map((domain) => {
                      const Icon = domain.icon;
                      const isSelected = domain.id === selectedDomain;

                      return (
                        <button
                          key={domain.id}
                          type="button"
                          onClick={() => setSelectedDomain(domain.id)}
                          className={cn(
                            "rounded-2xl border p-5 text-left transition-all duration-200 flex flex-col justify-between group",
                            isSelected
                              ? "border-primary bg-primary/[0.07] shadow-[0_0_24px_hsl(var(--primary)/0.15)] ring-1 ring-primary"
                              : "border-border/80 bg-background/40 hover:border-border hover:bg-card"
                          )}
                        >
                          <div>
                            <div className="mb-4 flex items-center justify-between">
                              <div className={cn(
                                "flex size-10 items-center justify-center rounded-xl border transition-transform group-hover:scale-105",
                                isSelected ? "border-primary/40 bg-primary/20 text-primary" : "border-border bg-card text-muted-foreground"
                              )}>
                                <Icon className="size-5" />
                              </div>
                              {isSelected ? (
                                <CheckCircle2 className="size-5 text-primary" />
                              ) : (
                                <span className="font-mono text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                                  {domain.badge}
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-bold text-foreground mb-1.5">{domain.title}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {domain.description}
                            </p>
                          </div>

                          <div className="mt-5 pt-3 border-t border-border/60">
                            <p className="text-[10px] font-mono text-emerald-400 truncate">
                              ✓ {domain.guardrails}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {/* STEP 2: INTENT & PROMPT COMPOSER */}
          {step === 2 && (
            <motion.section key="step-2" {...stepMotion}>
              <div className="grid gap-5 lg:grid-cols-12">
                <Card className="border-border/80 bg-card rounded-2xl lg:col-span-7 shadow-xl">
                  <CardContent className="space-y-5 p-5 sm:p-7">
                    <div className="flex items-center justify-between border-b border-border/70 pb-4">
                      <div>
                        <h2 className="text-base font-bold text-foreground">Describe Agent Intent</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          State desired capabilities and tools in plain language
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                        Step 2 of 3
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agent-name" className="text-xs font-semibold text-foreground">
                        Agent Identifier & Name
                      </Label>
                      <Input
                        id="agent-name"
                        value={agentName}
                        onChange={(event) => setAgentName(event.target.value)}
                        className="h-10 border-border/80 bg-background/50 text-xs focus-visible:ring-primary rounded-xl"
                        placeholder="e.g. Operations Assistant"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="agent-description" className="text-xs font-semibold text-foreground">
                          Natural Language Objective & Prompts
                        </Label>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          Domain: {activeDomain.title}
                        </span>
                      </div>
                      <Textarea
                        id="agent-description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        className="min-h-[160px] border-border/80 bg-background/50 text-xs leading-relaxed focus-visible:ring-primary rounded-xl"
                        placeholder="State what this agent should accomplish, what data sources to parse, and what tools to dispatch..."
                      />
                      <p className="text-[11px] font-mono text-primary flex items-center gap-1">
                        <Sparkles className="size-3" />
                        {activeDomain.hint}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Blueprint Accelerator Panel */}
                <Card className="border-border/80 bg-card rounded-2xl lg:col-span-5 shadow-xl">
                  <CardContent className="space-y-3.5 p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Sparkles className="size-3.5" />
                      </div>
                      <h3 className="text-xs font-bold text-foreground">Prompt Blueprints</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Load pre-calibrated domain templates with validated parameters:
                    </p>
                    
                    <div className="space-y-2 pt-1">
                      {promptTemplates.map((template) => (
                        <button
                          key={template.title}
                          type="button"
                          onClick={() => {
                            setAgentName(template.title);
                            setDescription(template.prompt);
                            toast.success(`Loaded "${template.title}" template`);
                          }}
                          className="w-full rounded-xl border border-border/80 bg-background/40 p-3 text-left transition-all hover:border-primary/50 hover:bg-card group"
                        >
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {template.title}
                          </p>
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

          {/* STEP 3: WORKFLOW IR INSPECTION & DEPLOYMENT */}
          {step === 3 && (
            <motion.section key="step-3" {...stepMotion}>
              <Card className="border-border/80 bg-card rounded-2xl shadow-xl">
                <CardContent className="space-y-5 p-5 sm:p-7">
                  <div className="flex items-center justify-between border-b border-border/70 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-foreground">Inspect & Deploy Agent</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Verify intermediate schema, node connections, and deploy to production runtime
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

        {/* Studio Sticky Control Bar */}
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/90 p-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between shadow-xl">
          <div className="text-xs text-muted-foreground font-mono">
            {created ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                Workflow compiled and live in engine
              </span>
            ) : (
              <span>State preserved in active session.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((prev) => (prev === 3 ? 2 : 1))}
              disabled={step === 1 || isCreating || generating}
              className="h-9 border-border/80 bg-background/50 text-xs font-medium text-foreground hover:bg-card rounded-lg"
            >
              Back
            </Button>

            {step === 1 && (
              <Button
                size="sm"
                onClick={() => setStep(2)}
                className="h-9 gap-1.5 bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg"
              >
                <span>Continue</span>
                <ArrowRight className="size-3.5" />
              </Button>
            )}

            {step === 2 && (
              <Button
                size="sm"
                onClick={handleStepTwoContinue}
                disabled={generating}
                className="h-9 gap-1.5 bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Compiling Graph…</span>
                  </>
                ) : (
                  <>
                    <Zap className="size-3.5" />
                    <span>Compile Workflow</span>
                  </>
                )}
              </Button>
            )}

            {step === 3 && (
              <Button
                size="sm"
                onClick={handleCreateAgent}
                disabled={isCreating || created || generating || !workflow}
                className={cn(
                  "h-9 min-w-36 gap-1.5 bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 rounded-lg",
                  !created && !isCreating && "glow-primary"
                )}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Deploying Runtime…</span>
                  </>
                ) : created ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-secondary" />
                    <span>Live in Engine</span>
                  </>
                ) : (
                  <>
                    <Rocket className="size-3.5" />
                    <span>Deploy Agent</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
