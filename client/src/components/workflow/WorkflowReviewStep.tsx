import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, WandSparkles, Code2, Workflow } from "lucide-react";

import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { wrapWorkflowConfig, getWorkflowMetrics } from "../../lib/parseWorkflow";
import type { AgentWorkflowConfig } from "../../types/workflow";
import { WorkflowJsonPanel } from "./WorkflowJsonPanel";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { WorkflowMetricsBar } from "./WorkflowMetricsBar";

interface WorkflowReviewStepProps {
  workflow: AgentWorkflowConfig | null;
  generating: boolean;
}

export const WorkflowReviewStep = ({ workflow, generating }: WorkflowReviewStepProps) => {
  const [activeTab, setActiveTab] = useState<"json" | "visual">("json");
  const [isRenderingFlow, setIsRenderingFlow] = useState(false);

  const parsed = useMemo(
    () => (workflow ? wrapWorkflowConfig(workflow) : null),
    [workflow]
  );

  const metrics = useMemo(
    () => getWorkflowMetrics(parsed?.config ?? null),
    [parsed]
  );

  useEffect(() => {
    if (!generating && workflow && activeTab === "visual") {
      setIsRenderingFlow(true);
      const t = window.setTimeout(() => setIsRenderingFlow(false), 800);
      return () => window.clearTimeout(t);
    }
  }, [generating, workflow, activeTab]);

  if (generating) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
        <div className="relative flex size-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="absolute inset-0 animate-ping rounded-full border border-primary/20" />
        </div>
        <div>
          <p className="text-base font-medium">AI is analyzing your prompt</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Extracting workflow, agents, tools, and orchestration plan…
          </p>
        </div>
        <motion.div
          className="mt-2 h-1 w-56 overflow-hidden rounded-full bg-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-secondary"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    );
  }

  if (!workflow || !parsed) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No AI output available.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 text-primary">
          <WandSparkles className="size-4" />
          <span className="text-sm font-semibold">Preview & Test Agent</span>
        </div>
        {parsed.config?.task_summary && (
          <p className="max-w-xl text-xs text-muted-foreground">{parsed.config.task_summary}</p>
        )}
      </motion.div>

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
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/40">
          <TabsTrigger value="json" className="gap-2 data-[state=active]:bg-card">
            <Code2 className="size-3.5" />
            JSON Configuration
          </TabsTrigger>
          <TabsTrigger value="visual" className="gap-2 data-[state=active]:bg-card">
            <Workflow className="size-3.5" />
            Visual Workflow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="json" className="mt-4 focus-visible:outline-none">
          <motion.div
            key="json-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <WorkflowJsonPanel
              formattedJson={parsed.formattedJson}
              isValidJson={parsed.isValidJson}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="visual" className="mt-4 focus-visible:outline-none">
          <motion.div
            key="visual-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <WorkflowCanvas
              config={parsed.config}
              rawWorkflow={parsed.raw}
              isValidJson={parsed.isValidJson}
              isRendering={isRenderingFlow}
            />
          </motion.div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-border/60 text-muted-foreground">
          AI transparency
        </Badge>
        <Badge variant="outline" className="border-primary/30 text-primary/90">
          Visual intelligence
        </Badge>
        <Badge variant="outline" className="border-secondary/30 text-secondary">
          Enterprise orchestration UX
        </Badge>
      </div>
    </div>
  );
};