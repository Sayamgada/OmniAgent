import { useEffect, useMemo, useState } from "react";
import { Loader2, Code2, Workflow, CheckCircle2, AlertTriangle } from "lucide-react";

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

export const WorkflowReviewStep = ({
  workflow,
  integrations,
  generating,
  onConnectIntegration,
}: WorkflowReviewStepProps) => {
  const [activeTab, setActiveTab] = useState<"json" | "visual">("visual");
  const [isRenderingFlow, setIsRenderingFlow] = useState(false);

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
      const t = window.setTimeout(() => setIsRenderingFlow(false), 500);
      return () => window.clearTimeout(t);
    }
  }, [generating, workflow, activeTab]);

  if (generating) {
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
          <Loader2 className="size-7 animate-spin" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Compiling AI Agent Architecture…</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Extracting multi-agent nodes, reasoning steps, and API tool configurations
          </p>
        </div>
      </div>
    );
  }

  if (!workflow || !parsed) {
    return (
      <div className="py-12 text-center rounded-xl border border-border bg-card/40">
        <p className="text-xs text-muted-foreground">No workflow specification available to review.</p>
      </div>
    );
  }

  const missingRequired = integrations.filter((i) => i.required && !i.available);

  return (
    <div className="space-y-4 text-left">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-emerald-500" />
              <p className="text-sm font-bold text-foreground">
                {parsed.config?.automation_name ?? parsed.config?.task_summary ?? "Generated Automation"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {parsed.config?.automation_description ?? parsed.config?.task_summary ?? "Compiled multi-agent execution pipeline."}
            </p>
          </div>
          {parsed.config?.required_integrations?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {parsed.config.required_integrations.slice(0, 3).map((integration) => (
                <Badge key={integration.service} variant="outline" className="border-border bg-background/50 font-mono text-[10px] text-muted-foreground">
                  {integration.display_name || integration.service}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {integrations.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground">Required Integrations</h3>
            {missingRequired.length > 0 ? (
              <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-400 font-mono text-[10px]">
                <AlertTriangle className="size-3" />
                {missingRequired.length} unconfigured
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-secondary/40 bg-secondary/10 text-secondary font-mono text-[10px]">
                <CheckCircle2 className="size-3" />
                All ready
              </Badge>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {integrations.map((integ) => (
              <div
                key={integ.service}
                className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {integ.available ? (
                    <CheckCircle2 className="size-3.5 text-secondary shrink-0" />
                  ) : (
                    <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="font-medium text-foreground truncate">{integ.display_name}</span>
                  {!integ.required && (
                    <span className="text-[10px] text-muted-foreground font-mono">(optional)</span>
                  )}
                </div>

                {!integ.available && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 border-primary/40 text-[11px] text-primary hover:bg-primary/10"
                    onClick={() => onConnectIntegration?.(integ.service)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <WorkflowMetricsBar
        complexity={metrics.complexity}
        agentCount={metrics.agentCount}
        toolCount={metrics.toolCount}
        stepCount={metrics.stepCount}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "json" | "visual")}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-3">
          <TabsList className="bg-background/80 border border-border p-0.5 rounded-lg">
            <TabsTrigger value="visual" className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-card data-[state=active]:text-primary font-semibold">
              <Workflow className="size-3.5" />
              Visual Graph
            </TabsTrigger>
            <TabsTrigger value="json" className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-card data-[state=active]:text-primary font-semibold">
              <Code2 className="size-3.5" />
              JSON Schema
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