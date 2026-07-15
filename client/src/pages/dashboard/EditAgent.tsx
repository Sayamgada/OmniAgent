import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Brain,
  Calendar,
  Check,
  Clock,
  FileText,
  History,
  Layers,
  Link2,
  Loader2,
  Mic,
  Paperclip,
  Pencil,
  RotateCcw,
  Sparkles,
  Target,
  WandSparkles,
  Workflow,
  X,
} from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { WorkflowPipelinePreview } from "../../components/workflow/WorkflowPipelinePreview";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import {
  buildUpdatedWorkflow,
  getAgentEditDetail,
  suggestionChips,
  type PipelineNode,
} from "../../lib/edit-agent-data";
import { industryColors, industryLabels } from "../../lib/dashboard-data";
import { cn } from "../../lib/utils";

const MAX_CHARS = 1200;

const sectionMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

export default function EditAgent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const agent = useMemo(() => (id ? getAgentEditDetail(id) : null), [id]);

  const [changeRequest, setChangeRequest] = useState("");
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [updatedNodes, setUpdatedNodes] = useState<PipelineNode[] | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  if (!agent) {
    return <Navigate to="/agents" replace />;
  }

  const versions = agent.versions;

  const handleSuggestionClick = (suggestion: string) => {
    const phrase = suggestion.startsWith("Add") || suggestion.startsWith("Enable") || suggestion.startsWith("Connect") || suggestion.startsWith("Improve")
      ? `${suggestion}.`
      : suggestion;
    setChangeRequest((prev) => {
      const next = prev.trim() ? `${prev.trim()} ${phrase}` : phrase;
      return next.slice(0, MAX_CHARS);
    });
  };

  const handleGeneratePreview = () => {
    if (!changeRequest.trim()) {
      toast.error("Describe the changes you’d like to make");
      return;
    }

    setGenerating(true);
    setUpdatedNodes(null);
    setAiSummary(null);

    window.setTimeout(() => {
      const result = buildUpdatedWorkflow(agent.currentWorkflow, changeRequest);
      setUpdatedNodes(result.nodes);
      setAiSummary(result.summary);
      setGenerating(false);
      toast.success("Updated workflow preview ready");
    }, 1600);
  };

  const handleRegenerate = () => {
    if (!changeRequest.trim()) {
      toast.error("Describe the changes you’d like to make");
      return;
    }
    handleGeneratePreview();
  };

  const handleApply = () => {
    if (!updatedNodes) {
      toast.error("Generate an updated preview before applying");
      return;
    }

    setApplying(true);
    window.setTimeout(() => {
      setApplying(false);
      toast.success(`Changes applied — agent updated to v${bumpVersion(agent.version)}`);
      navigate("/agents");
    }, 1200);
  };

  const configItems = [
    { label: "Industry", value: industryLabels[agent.industry], icon: Layers },
    { label: "Automation Type", value: agent.automationType, icon: Workflow },
    { label: "Primary Goal", value: agent.primaryGoal, icon: Target },
    { label: "Connected Workflow", value: agent.connectedWorkflow, icon: Link2 },
    { label: "Knowledge Source", value: agent.knowledgeSource, icon: FileText },
    { label: "LLM", value: agent.model, icon: Bot },
    {
      label: "Memory Enabled",
      value: agent.memoryEnabled ? "Enabled" : "Disabled",
      icon: Brain,
    },
    {
      label: "Integrations",
      value: agent.integrations.length ? agent.integrations.join(", ") : "None",
      icon: Link2,
    },
  ];

  return (
    <div className="relative mx-auto max-w-[1400px] space-y-8">
      {/* Header */}
      <motion.div
        {...sectionMotion}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Edit Agent</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review your existing AI agent, describe the changes you want, preview the updated
            workflow, and apply improvements before deployment.
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "w-fit shrink-0 px-3 py-1 text-xs",
            agent.status === "active"
              ? "border-secondary/40 bg-secondary/10 text-secondary"
              : "border-muted-foreground/30 bg-muted text-muted-foreground"
          )}
        >
          {agent.status === "active" ? "Active" : "Inactive"}
        </Badge>
      </motion.div>

      {/* Section 1 — Overview */}
      <motion.section
        {...sectionMotion}
        transition={{ ...sectionMotion.transition, delay: 0.04 }}
        className="glass-card rounded-2xl p-6 lg:p-8"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight lg:text-2xl">{agent.name}</h2>
              <Badge variant="outline" className={cn("text-xs", industryColors[agent.industry])}>
                {industryLabels[agent.industry]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground lg:max-w-2xl">{agent.description}</p>
            <p className="text-xs text-muted-foreground">{agent.category}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:max-w-md">
            <MetaItem icon={Bot} label="Model" value={agent.model} />
            <MetaItem icon={Layers} label="Version" value={agent.version} />
            <MetaItem icon={Calendar} label="Created" value={agent.createdAt} />
            <MetaItem icon={Clock} label="Last Modified" value={agent.lastModified} />
          </div>
        </div>
      </motion.section>

      {/* Section 2 — Configuration */}
      <motion.section
        {...sectionMotion}
        transition={{ ...sectionMotion.transition, delay: 0.08 }}
        className="space-y-4"
      >
        <div>
          <h2 className="text-lg font-semibold">Current Agent Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only snapshot of how this agent is configured today.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {configItems.map((item) => (
            <div
              key={item.label}
              className="glass-card rounded-2xl border-white/[0.06] p-4 transition-colors hover:border-primary/20"
            >
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <item.icon className="size-3.5 text-primary/80" />
                <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Section 3 — Current Workflow */}
      <motion.section
        {...sectionMotion}
        transition={{ ...sectionMotion.transition, delay: 0.1 }}
        className="glass-card rounded-2xl p-6 lg:p-8"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Workflow className="size-4 text-primary" />
            <h2 className="text-lg font-semibold">Existing Workflow Preview</h2>
          </div>
          <p className="text-xs text-muted-foreground">Live visualization · not editable</p>
        </div>
        <WorkflowPipelinePreview
          nodes={agent.currentWorkflow}
          label="Current Workflow"
          version={agent.version}
        />
      </motion.section>

      {/* Section 4 — Describe Changes */}
      <motion.section
        {...sectionMotion}
        transition={{ ...sectionMotion.transition, delay: 0.12 }}
        className="glass-card rounded-2xl p-6 lg:p-8"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <Pencil className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Describe the Changes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell OmniAgent how you’d like this agent to evolve. Use natural language — no coding
              required.
            </p>
          </div>
        </div>

        <Textarea
          value={changeRequest}
          onChange={(e) => setChangeRequest(e.target.value.slice(0, MAX_CHARS))}
          placeholder={
            "Examples:\n• Add email notifications after approval.\n• Make responses shorter.\n• Connect Slack.\n• Use Claude instead of GPT-4o.\n• Add PDF document support.\n• Improve policy retrieval accuracy.\n• Add approval workflow."
          }
          className="min-h-[180px] resize-y border-border/50 bg-muted/30 text-sm leading-relaxed placeholder:text-muted-foreground/60"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-border/60 bg-card/40"
              onClick={() => toast.message("Document attach coming soon")}
            >
              <Paperclip className="size-3.5" />
              Attach Document
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => toast.message("Voice input coming soon")}
            >
              <Mic className="size-4" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            {changeRequest.length}/{MAX_CHARS}
          </span>
        </div>
      </motion.section>

      {/* Section 5 — Suggestions */}
      <motion.section
        {...sectionMotion}
        transition={{ ...sectionMotion.transition, delay: 0.14 }}
        className="space-y-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-lg font-semibold">Suggested Improvements</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a suggestion to add it to your change request.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestionChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSuggestionClick(chip)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#1E1E1E]/80 px-3.5 py-2 text-xs font-medium text-foreground/90 transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_16px_rgba(29,143,255,0.15)]"
            >
              <Check className="size-3 text-secondary" />
              {chip}
            </button>
          ))}
        </div>
      </motion.section>

      {/* Primary CTA */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleGeneratePreview}
          disabled={generating}
          className="glow-primary-strong gap-2 border border-primary/50 px-8 text-base"
        >
          {generating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating Preview…
            </>
          ) : (
            <>
              <WandSparkles className="size-4" />
              Generate Updated Preview
            </>
          )}
        </Button>
      </div>

      {/* Section 6 — Updated Workflow + compare */}
      <AnimatePresence mode="wait">
        {(generating || updatedNodes) && (
          <motion.section
            key="updated-preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card space-y-6 rounded-2xl p-6 lg:p-8"
          >
            <div>
              <h2 className="text-lg font-semibold">Updated Workflow Preview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Compare the current automation with the AI-proposed changes.
              </p>
            </div>

            {generating ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
                <div className="relative flex size-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                  <Loader2 className="size-7 animate-spin text-primary" />
                  <span className="absolute inset-0 animate-ping rounded-full border border-primary/20" />
                </div>
                <div>
                  <p className="text-sm font-medium">OmniAgent is evolving your workflow</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Analyzing your request and composing an updated pipeline…
                  </p>
                </div>
              </div>
            ) : (
              updatedNodes && (
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.06] bg-background/40 p-5">
                    <WorkflowPipelinePreview
                      nodes={agent.currentWorkflow}
                      label="Current"
                      version={agent.version}
                    />
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5">
                    <WorkflowPipelinePreview
                      nodes={updatedNodes}
                      label="Updated"
                      version={`${bumpVersion(agent.version)} (draft)`}
                      showLegend
                    />
                  </div>
                </div>
              )
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Section 7 — AI Summary */}
      <AnimatePresence>
        {aiSummary && !generating && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card rounded-2xl border-primary/20 p-6 lg:p-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 shadow-[0_0_20px_rgba(29,143,255,0.2)]">
                <Sparkles className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">AI Summary</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{aiSummary}</p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Section 8 — Version History */}
      <motion.section
        {...sectionMotion}
        transition={{ ...sectionMotion.transition, delay: 0.16 }}
        className="glass-card rounded-2xl p-6 lg:p-8"
      >
        <div className="mb-6 flex items-center gap-2">
          <History className="size-4 text-primary" />
          <h2 className="text-lg font-semibold">Version History</h2>
        </div>

        <div className="relative space-y-0 pl-2">
          <div className="absolute bottom-4 left-[19px] top-4 w-px bg-gradient-to-b from-primary/50 via-border to-transparent" />
          {versions.map((v, i) => (
            <div key={`${v.version}-${i}`} className="relative flex gap-4 pb-8 last:pb-0">
              <div
                className={cn(
                  "relative z-10 mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border",
                  i === 0
                    ? "border-primary/50 bg-primary/15 text-primary shadow-[0_0_12px_rgba(29,143,255,0.3)]"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                <span className="text-[10px] font-bold">{v.version.replace("Version ", "").slice(0, 3)}</span>
              </div>
              <div className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-[#1E1E1E]/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">Version {v.version}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{v.date}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{v.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-border/60 bg-card/40 text-xs"
                      onClick={() => toast.message(`Viewing details for v${v.version}`)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 text-xs text-muted-foreground"
                      onClick={() => toast.success(`Restored version ${v.version}`)}
                    >
                      <RotateCcw className="size-3" />
                      Restore Version
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Sticky bottom action bar */}
      <div className="sticky bottom-0 z-40 -mx-4 border-t border-border/40 bg-background/90 px-4 py-3 backdrop-blur-xl lg:-mx-6 lg:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">
            Describe changes → preview → apply when ready
          </p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <Button variant="ghost" className="gap-1.5" asChild>
              <Link to="/agents">
                <X className="size-4" />
                Cancel
              </Link>
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 border-border/60"
              onClick={handleRegenerate}
              disabled={generating || !changeRequest.trim()}
            >
              <RotateCcw className="size-3.5" />
              Regenerate
            </Button>
            <Button
              className="glow-primary gap-1.5 border border-primary/50"
              onClick={handleApply}
              disabled={applying || !updatedNodes || generating}
            >
              {applying ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Applying…
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Apply Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function bumpVersion(version: string): string {
  const match = version.match(/^(\d+)\.(\d+)/);
  if (!match) return "1.1";
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return `${major}.${minor + 1}`;
}
