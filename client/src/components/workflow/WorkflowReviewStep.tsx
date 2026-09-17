import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Code2,
  Workflow,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Bot,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { wrapWorkflowConfig, getWorkflowMetrics, normalizeWorkflowPayload } from "../../lib/parseWorkflow";
import type { AgentWorkflowConfig } from "../../types/workflow";
import { WorkflowJsonPanel } from "./WorkflowJsonPanel";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { WorkflowMetricsBar } from "./WorkflowMetricsBar";

interface IntegrationStatus {
  service: string;
  display_name: string;
  required: boolean;
  available: boolean;
}

interface WorkflowReviewStepProps {
  workflow: AgentWorkflowConfig | Record<string, unknown> | null;
  integrations: IntegrationStatus[];
  generating: boolean;
  onConnectIntegration?: (service: string) => void;
}

const compilerStages = [
  { label: "Decomposing Natural Intent", icon: Sparkles, detail: "Extracting goal parameters & entity constraints" },
  { label: "Applying Domain Schema Guardrails", icon: ShieldCheck, detail: "Anchoring regulatory & policy boundary rules" },
  { label: "Synthesizing Multi-Agent Role Topology", icon: Bot, detail: "Mapping Ingestion, Reasoner & Tool nodes" },
  { label: "Validating Intermediate Representation (IR)", icon: Code2, detail: "Checking argument schemas against registry" },
  { label: "Preparing n8n Execution Pipeline", icon: Zap, detail: "Binding OAuth credentials & webhook triggers" },
];

export const WorkflowReviewStep = ({
  workflow,
  integrations,
  generating,
  onConnectIntegration,
}: WorkflowReviewStepProps) => {
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");
  const [isRenderingFlow, setIsRenderingFlow] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  // Rotate through stages while generating
  useEffect(() => {
    if (!generating) {
      setCurrentStageIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentStageIdx((prev) => (prev + 1) % compilerStages.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [generating]);

  const parsed = useMemo(() => {
    if (!workflow) return null;
    const normalized = normalizeWorkflowPayload(workflow) ?? (workflow as AgentWorkflowConfig);
    return wrapWorkflowConfig(normalized);
  }, [workflow]);

  const metrics = useMemo(
    () => getWorkflowMetrics(parsed?.config ?? null),
    [parsed]
  );

  useEffect(() => {
    if (!generating && workflow && activeTab === "visual") {
      setIsRenderingFlow(true);
      const t = window.setTimeout(() => setIsRenderingFlow(false), 450);
      return () => window.clearTimeout(t);
    }
  }, [generating, workflow, activeTab]);

  if (generating) {
    const stage = compilerStages[currentStageIdx];
    const StageIcon = stage.icon;

    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
          <div className="relative flex size-16 items-center justify-center rounded-2xl border border-primary/40 bg-card text-primary shadow-2xl">
            <StageIcon className="size-8 animate-bounce" />
          </div>
        </div>

        <motion.div
          key={stage.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="space-y-1.5 max-w-md"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono font-medium text-primary">
            <Loader2 className="size-3.5 animate-spin" />
            <span>Compiler Active · Stage 0{currentStageIdx + 1} of 05</span>
          </div>
          <h3 className="text-base font-bold text-foreground">{stage.label}</h3>
          <p className="text-xs text-muted-foreground font-mono">{stage.detail}</p>
        </motion.div>

        {/* Multi-stage Progress Indicators */}
        <div className="mt-8 flex items-center gap-1.5 max-w-xs w-full">
          {compilerStages.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i === currentStageIdx
                  ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                  : i < currentStageIdx
                  ? "bg-secondary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!workflow || !parsed) {
    return (
      <div className="py-16 text-center rounded-2xl border border-border/80 bg-card/40 space-y-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 border border-border text-muted-foreground mx-auto">
          <Workflow className="size-5" />
        </div>
        <p className="text-xs font-semibold text-foreground">No workflow specification generated yet</p>
        <p className="text-[11px] text-muted-foreground">Return to Step 2 to configure and trigger workflow compilation.</p>
      </div>
    );
  }

  const missingRequired = integrations.filter((i) => i.required && !i.available);

  return (
    <div className="space-y-5 text-left">
      {/* Overview Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-bold text-foreground">
                {parsed.config?.automation_name ?? parsed.config?.task_summary ?? "Generated Automation"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              {parsed.config?.automation_description ?? parsed.config?.task_summary ?? "Compiled multi-agent execution pipeline."}
            </p>
          </div>
          {parsed.config?.required_integrations?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {parsed.config.required_integrations.slice(0, 4).map((integration) => (
                <Badge key={integration.service} variant="outline" className="border-border bg-background/50 font-mono text-[10px] text-muted-foreground">
                  {integration.display_name || integration.service}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Integration Requirement Checklist */}
      {integrations.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground">Integration Dependencies</h3>
            </div>
            {missingRequired.length > 0 ? (
              <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-400 font-mono text-[10px]">
                <AlertTriangle className="size-3" />
                {missingRequired.length} unconfigured
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-secondary/40 bg-secondary/10 text-secondary font-mono text-[10px]">
                <CheckCircle2 className="size-3" />
                All credentials verified
              </Badge>
            )}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {integrations.map((integ) => (
              <div
                key={integ.service}
                className="flex items-center justify-between rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {integ.available ? (
                    <CheckCircle2 className="size-4 text-secondary shrink-0" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-400 shrink-0" />
                  )}
                  <span className="font-semibold text-foreground truncate">{integ.display_name}</span>
                  {!integ.required && (
                    <span className="text-[10px] text-muted-foreground font-mono">(optional)</span>
                  )}
                </div>

                {!integ.available && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2.5 border-primary/40 text-[11px] text-primary hover:bg-primary/10 rounded-md"
                    onClick={() => onConnectIntegration?.(integ.service)}
                  >
                    Configure
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Bar */}
      <WorkflowMetricsBar
        complexity={metrics.complexity}
        agentCount={metrics.agentCount}
        toolCount={metrics.toolCount}
        stepCount={metrics.stepCount}
      />

      {/* Tabbed Canvas & JSON Inspector */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "json" | "visual")}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-3">
          <TabsList className="bg-background/80 border border-border/80 p-1 rounded-xl">
            <TabsTrigger value="visual" className="h-8 gap-1.5 px-3.5 text-xs data-[state=active]:bg-card data-[state=active]:text-primary font-semibold rounded-lg">
              <Workflow className="size-3.5" />
              <span>Interactive Topology Graph</span>
            </TabsTrigger>
            <TabsTrigger value="json" className="h-8 gap-1.5 px-3.5 text-xs data-[state=active]:bg-card data-[state=active]:text-primary font-semibold rounded-lg">
              <Code2 className="size-3.5" />
              <span>IR Schema Specification</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visual" className="mt-0 focus-visible:outline-none">
          <WorkflowCanvas
            config={parsed.config}
            rawWorkflow={parsed.raw}
            isValidJson={parsed.isValidJson}
            isRendering={isRenderingFlow}
          />
        </TabsContent>

        <TabsContent value="json" className="mt-0 focus-visible:outline-none">
          <WorkflowJsonPanel
            formattedJson={parsed.formattedJson}
            isValidJson={parsed.isValidJson}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};