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
import { industryLabels } from "../../lib/dashboard-data";
import { cn } from "../../lib/utils";

const MAX_CHARS = 1200;

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
    { label: "LLM Model", value: agent.model, icon: Bot },
    {
      label: "Memory Enabled",
      value: agent.memoryEnabled ? "Enabled" : "Disabled",
      icon: Brain,
    },
    {
      label: "Integrations",
      value: agent.integrations.length ? agent.integrations.join(", ") : "None configured",
      icon: Link2,
    },
  ];

  return (
    <div className="relative mx-auto max-w-6xl space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <Link to="/agents" className="hover:text-foreground">Agents</Link>
            <span>/</span>
            <span>{agent.id}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Edit Agent</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Refine agent configuration, simulate workflow modifications, and verify pipeline execution changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-xs font-semibold px-2.5 py-1",
              agent.status === "active"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
            )}
          >
            {agent.status === "active" ? "Active" : "Inactive"}
          </Badge>
          <span className="font-mono text-xs rounded border border-border bg-card px-2 py-1 text-muted-foreground">
            v{agent.version}
          </span>
        </div>
      </div>

      {/* Section 1 — Overview */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground">{agent.name}</h2>
              <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {industryLabels[agent.industry]}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground lg:max-w-2xl">{agent.description}</p>
            <p className="font-mono text-[11px] text-muted-foreground/80">{agent.category}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-md w-full">
            <MetaItem icon={Bot} label="Model" value={agent.model} />
            <MetaItem icon={Layers} label="Version" value={`v${agent.version}`} />
            <MetaItem icon={Calendar} label="Created" value={agent.createdAt} />
            <MetaItem icon={Clock} label="Modified" value={agent.lastModified} />
          </div>
        </div>
      </section>

      {/* Section 2 — Configuration */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xs font-bold text-foreground">Current Agent Configuration</h2>
          <p className="text-[11px] text-muted-foreground">
            Read-only configuration snapshot of the deployed instance.
          </p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {configItems.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border bg-card/80 p-3.5"
            >
              <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
                <item.icon className="size-3 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider">{item.label}</span>
              </div>
              <p className="text-xs font-semibold text-foreground truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — Current Workflow */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Workflow className="size-4 text-primary" />
            <h2 className="text-xs font-bold text-foreground">Existing Workflow Pipeline</h2>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">Live visualization · Read-only</span>
        </div>
        <WorkflowPipelinePreview
          nodes={agent.currentWorkflow}
          label="Current Production Workflow"
          version={agent.version}
        />
      </section>

      {/* Section 4 — Describe Changes */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <Pencil className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Describe Modifications</h2>
            <p className="text-xs text-muted-foreground">
              Provide natural language instructions for the changes or node pipeline extensions required.
            </p>
          </div>
        </div>

        <Textarea
          value={changeRequest}
          onChange={(e) => setChangeRequest(e.target.value.slice(0, MAX_CHARS))}
          placeholder={
            "Examples:\n• Add email notifications after approval.\n• Make responses shorter and more concise.\n• Connect Slack workspace notifications.\n• Switch reasoning model to Claude 3.5 Sonnet.\n• Add PDF compliance document validation step."
          }
          className="min-h-[140px] resize-y rounded-lg border-border bg-background/50 font-sans text-xs leading-relaxed placeholder:text-muted-foreground/60"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-border bg-background/50 text-xs"
              onClick={() => toast.message("Document attachment coming soon")}
            >
              <Paperclip className="size-3.5" />
              Attach Document
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => toast.message("Voice input coming soon")}
            >
              <Mic className="size-3.5" />
            </Button>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            {changeRequest.length}/{MAX_CHARS}
          </span>
        </div>
      </section>

      {/* Section 5 — Suggestions */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <h2 className="text-xs font-bold text-foreground">Suggested Modifications</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestionChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSuggestionClick(chip)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground/90 transition hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
            >
              <Check className="size-3 text-emerald-400" />
              {chip}
            </button>
          ))}
        </div>
      </section>

      {/* Primary CTA */}
      <div className="flex justify-center py-2">
        <Button
          size="lg"
          onClick={handleGeneratePreview}
          disabled={generating}
          className="h-10 gap-2 bg-primary px-6 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary"
        >
          {generating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Simulating Workflow Changes…
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4"
          >
            <div>
              <h2 className="text-sm font-bold text-foreground">Workflow Comparison Preview</h2>
              <p className="text-xs text-muted-foreground">
                Compare the active production pipeline against the proposed simulation.
              </p>
            </div>

            {generating ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                <div className="flex size-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                  <Loader2 className="size-5 animate-spin" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Analyzing modification request</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    Synthesizing updated node pipeline…
                  </p>
                </div>
              </div>
            ) : (
              updatedNodes && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background/50 p-4">
                    <WorkflowPipelinePreview
                      nodes={agent.currentWorkflow}
                      label="Current Pipeline"
                      version={agent.version}
                    />
                  </div>
                  <div className="rounded-xl border border-primary/40 bg-primary/[0.02] p-4">
                    <WorkflowPipelinePreview
                      nodes={updatedNodes}
                      label="Proposed Pipeline"
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-primary/30 bg-card p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-foreground">Synthesis Summary</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{aiSummary}</p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Section 8 — Version History */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <h2 className="text-xs font-bold text-foreground">Version History</h2>
        </div>

        <div className="space-y-3">
          {versions.map((v, i) => (
            <div key={`${v.version}-${i}`} className="flex flex-col gap-3 rounded-xl border border-border bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">v{v.version}</span>
                  {i === 0 && (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-primary">
                      Current
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-muted-foreground">{v.date}</span>
                </div>
                <p className="text-xs text-muted-foreground">{v.summary}</p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-border bg-card text-xs"
                  onClick={() => toast.message(`Viewing details for v${v.version}`)}
                >
                  Details
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => toast.success(`Restored version ${v.version}`)}
                >
                  <RotateCcw className="size-3" />
                  Restore
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sticky bottom action bar */}
      <div className="sticky bottom-0 z-40 -mx-4 border-t border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md lg:-mx-6 lg:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="hidden font-mono text-[11px] text-muted-foreground sm:block">
            Specify changes → generate preview → apply to update version
          </p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground" asChild>
              <Link to="/agents">
                <X className="size-3.5" />
                Cancel
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-border bg-card text-xs"
              onClick={handleRegenerate}
              disabled={generating || !changeRequest.trim()}
            >
              <RotateCcw className="size-3" />
              Regenerate
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary"
              onClick={handleApply}
              disabled={applying || !updatedNodes || generating}
            >
              {applying ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Applying Changes…
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
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
    <div className="rounded-lg border border-border/80 bg-background/40 p-2.5">
      <div className="mb-1 flex items-center gap-1 text-muted-foreground">
        <Icon className="size-3" />
        <span className="font-mono text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-mono text-xs font-semibold text-foreground truncate">{value}</p>
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
