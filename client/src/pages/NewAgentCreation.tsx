import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  CircleUserRound,
  GraduationCap,
  Landmark,
  Loader2,
  WandSparkles,
} from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { cn } from "../lib/utils";

type DomainId = "corporate" | "education" | "finance";

const domains: Array<{
  id: DomainId;
  title: string;
  description: string;
  icon: typeof Briefcase;
  hint: string;
}> = [
    {
      id: "corporate",
      title: "Corporate Operations",
      description: "Automate workflow, communication, and task coordination.",
      icon: Briefcase,
      hint: "Your agent will be configured for Corporate Operations tasks",
    },
    {
      id: "education",
      title: "Education",
      description: "Support learning plans, tutoring, and curriculum workflows.",
      icon: GraduationCap,
      hint: "Your agent will be configured for Education workflows",
    },
    {
      id: "finance",
      title: "Finance",
      description: "Analyze reports, forecast trends, and simplify decisions.",
      icon: Landmark,
      hint: "Your agent will be configured for Finance insights",
    },
  ];

const promptTemplates = [
  {
    title: "Email Assistant",
    prompt:
      "Create an AI assistant that drafts professional emails, summarizes inbox priorities, and suggests meeting times based on team availability.",
  },
  {
    title: "Study Planner",
    prompt:
      "Build an AI tutor that creates weekly study plans, explains topics step-by-step, and generates short quizzes for exam preparation.",
  },
  {
    title: "Finance Report Analyzer",
    prompt:
      "Design a finance AI that reviews monthly reports, flags unusual trends, and generates executive-ready summary highlights.",
  },
];

const stepMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -18 },
  transition: { duration: 0.28, ease: "easeOut" as const },
};

const NewAgentCreation = () => {
  const [step, setStep] = useState(1);
  const [selectedDomain, setSelectedDomain] = useState<DomainId>("corporate");  
  const [agentName, setAgentName] = useState("Omni Ops Assistant");
  const [description, setDescription] = useState(
    "Create an AI assistant that helps draft professional emails and schedule meetings with clear priorities."
  );
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const activeDomain = useMemo(
    () => domains.find((domain) => domain.id === selectedDomain) ?? domains[0],
    [selectedDomain]
  );

  const handleCreateAgent = () => {
    setIsCreating(true);

    window.setTimeout(() => {
      setIsCreating(false);
      setCreated(true);
    }, 1700);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(211_100%_50%_/_0.18),_transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,hsl(0_0%_16.5%_/_0.4)_50%,transparent_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(hsl(0_0%_16.5%_/_0.25)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_16.5%_/_0.25)_1px,transparent_1px)] bg-[size:60px_60px]" />
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="animate-float absolute size-1.5 rounded-full bg-primary/70"
            style={{
              left: `${(idx + 1) * 11}%`,
              top: `${14 + (idx % 3) * 20}%`,
              animationDelay: `${idx * 0.8}s`,
            }}
          />
        ))}
      </div>

      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed left-0 right-0 top-0 z-50 glass-card border-b border-border/30"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2 text-xl font-bold">
            <Bot className="h-7 w-7 text-primary" />
            <span className="gradient-text">OmniAgent</span>
          </a>
          <div className="flex items-center gap-3 rounded-full border border-border bg-card/70 px-3 py-2">
            <CircleUserRound className="size-5 text-primary" />
            <span className="text-sm text-foreground/90">Sayam Gada</span>
          </div>
        </div>
      </motion.nav>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-10 pt-24">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">Create New AI Agent</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Design and generate a custom AI assistant in minutes
            </p>
          </div>
          <div className="hidden rounded-full border border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground backdrop-blur md:flex md:items-center md:gap-2">
            <span className="size-2 animate-pulse rounded-full bg-secondary" />
            Autosave enabled
          </div>
        </div>

        <Card className="glass-card mb-6 border-border/80">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {["Select Domain", "Describe Agent", "Preview & Test"].map((label, index) => {
                const itemStep = index + 1;
                const isActive = itemStep === step;
                const isComplete = itemStep < step;

                return (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border text-sm transition-all duration-300",
                        isComplete && "border-secondary/60 bg-secondary/15 text-secondary glow-secondary",
                        isActive && "border-primary/70 bg-primary/15 text-primary glow-primary",
                        !isActive && !isComplete && "border-border bg-muted/20 text-muted-foreground"
                      )}
                    >
                      {isComplete ? <Check className="size-4" /> : itemStep}
                    </div>
                    <p className={cn("text-sm", isActive ? "text-foreground" : "text-muted-foreground")}>{label}</p>
                    {index < 2 && <div className="mx-1 h-px w-8 bg-border/80 md:w-14" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section key="step-1" {...stepMotion}>
              <Card className="glass-card border-border/70">
                <CardContent className="space-y-6 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">Select Domain</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Choose the core industry context for your AI agent
                      </p>
                    </div>
                    <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Step 1 of 3</Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {domains.map((domain) => {
                      const Icon = domain.icon;
                      const selected = domain.id === selectedDomain;

                      return (
                        <button
                          key={domain.id}
                          type="button"
                          onClick={() => setSelectedDomain(domain.id)}
                          className={cn(
                            "glass-card-hover rounded-xl border p-4 text-left",
                            selected
                              ? "border-primary/70 bg-primary/10 shadow-[0_0_35px_rgba(0,123,255,0.25)]"
                              : "border-border/70"
                          )}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-background/40">
                              <Icon className="size-5 text-primary" />
                            </div>
                            {selected && <CheckCircle2 className="size-5 text-primary" />}
                          </div>
                          <h3 className="text-base font-semibold">{domain.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{domain.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-end">
                      <p className="rounded-lg border border-border bg-card/55 px-3 py-2 text-xs text-muted-foreground">
                        Tip: Be specific to get better results
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section key="step-2" {...stepMotion}>
              <div className="grid gap-5 lg:grid-cols-5">
                <Card className="glass-card border-border/70 lg:col-span-3">
                  <CardContent className="space-y-5 p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Describe Agent</h2>
                      <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Step 2 of 3</Badge>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agent-name">Agent Name</Label>
                      <Input
                        id="agent-name"
                        value={agentName}
                        onChange={(event) => setAgentName(event.target.value)}
                        className="border-border/80 bg-card/70 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agent-description">Agent Description</Label>
                      <Textarea
                        id="agent-description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        className="min-h-[180px] border-border/80 bg-card/70 focus-visible:ring-primary"
                        placeholder="Create an AI assistant that helps draft professional emails and schedule meetings..."
                      />
                      <p className="text-xs text-primary/90">{activeDomain.hint}</p>
                    </div>

                  </CardContent>
                </Card>

                <Card className="glass-card border-border/70 lg:col-span-2">
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-center gap-2">
                      <WandSparkles className="size-4 text-primary" />
                      <h3 className="font-semibold">Smart Suggestions</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Click a template to autofill your description</p>
                    <div className="space-y-3">
                      {promptTemplates.map((template) => (
                        <button
                          key={template.title}
                          type="button"
                          onClick={() => setDescription(template.prompt)}
                          className="w-full rounded-xl border border-border bg-card/60 p-3 text-left transition-all hover:border-primary/60 hover:bg-primary/10"
                        >
                          <p className="font-medium">{template.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.prompt}</p>
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
              <Card className="glass-card border-border/70">
                <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                    <Loader2 className="size-7 animate-spin text-primary" />
                  </div>
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Step 3 of 3</Badge>
                  <h2 className="text-xl font-semibold">Preparing Preview & Test</h2>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    We are setting up your agent workspace. This step is currently shown as a loading state.
                  </p>
                </CardContent>
              </Card>
            </motion.section>
          )}
        </AnimatePresence>

        <div className="mt-6 flex flex-col gap-3 border-t border-border/80 pt-5 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-muted-foreground">
            {created ? "Agent successfully prepared for deployment." : "Progress is saved automatically"}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              disabled={step === 1 || isCreating}
              className="border-border bg-card/60 hover:bg-card"
            >
              Back
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                className="glow-primary border border-primary/50 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleCreateAgent}
                disabled={isCreating || created}
                className={cn(
                  "min-w-36 border border-primary/50 bg-primary text-primary-foreground hover:bg-primary/90",
                  !created && "glow-primary"
                )}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating...
                  </>
                ) : created ? (
                  <>
                    <CheckCircle2 className="mr-2 size-4 text-secondary" />
                    Created
                  </>
                ) : (
                  "Create Agent"
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewAgentCreation;
