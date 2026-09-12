import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { GitBranch, Sparkles } from "lucide-react";
import type { AgentWorkflowConfig } from "../../types/workflow";
import type { WorkflowNodeDetail } from "../../types/workflow";
import { buildWorkflowGraph, buildFallbackGraph } from "../../lib/buildWorkflowGraph";
import { WorkflowNodeCard, type WorkflowNodeData } from "./WorkflowNodeCard";
import { WorkflowNodeDetailPanel } from "./WorkflowNodeDetail";

const nodeTypes = { workflowNode: WorkflowNodeCard };

interface WorkflowCanvasProps {
  config: AgentWorkflowConfig | null;
  rawWorkflow: string;
  isValidJson: boolean;
  isRendering?: boolean;
}

export const WorkflowCanvas = ({
  config,
  rawWorkflow,
  isValidJson,
  isRendering = false,
}: WorkflowCanvasProps) => {
  const graph = useMemo(() => {
    if (config && isValidJson) return buildWorkflowGraph(config);
    return buildFallbackGraph(rawWorkflow);
  }, [config, isValidJson, rawWorkflow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const [selectedDetail, setSelectedDetail] = useState<WorkflowNodeDetail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const data = node.data as WorkflowNodeData;
    setSelectedDetail(data.detail);
    setSheetOpen(true);
  }, []);

  const highlightNodesForEdge = useCallback(
    (edgeId: string | null) => {
      setHoveredEdge(edgeId);
      if (!edgeId) {
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: { ...(n.data as WorkflowNodeData), highlighted: false },
          }))
        );
        return;
      }
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) return;
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...(n.data as WorkflowNodeData),
            highlighted: n.id === edge.source || n.id === edge.target,
          },
        }))
      );
    },
    [edges, setNodes]
  );

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-primary" />
          <div>
            <p className="text-xs font-bold text-foreground">Interactive Execution Topology</p>
            <p className="text-[10px] text-muted-foreground">Click any node to inspect parameters & variables</p>
          </div>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-medium text-primary">
          Live Graph
        </span>
      </div>

      <div className="relative h-[min(520px,60vh)] w-full bg-background/95">
        {isRendering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 text-primary">
              <Sparkles className="size-5 animate-pulse" />
            </div>
            <p className="text-xs font-mono text-muted-foreground">Compiling execution graph layout…</p>
          </motion.div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges.map((e) => ({
            ...e,
            style: {
              ...e.style,
              strokeWidth: hoveredEdge === e.id ? 2.5 : 1.5,
              stroke: hoveredEdge === e.id ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)",
            },
          }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeMouseEnter={(_, edge) => highlightNodesForEdge(edge.id)}
          onEdgeMouseLeave={() => highlightNodesForEdge(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          className="workflow-canvas"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(var(--border))" />
          <Controls
            showInteractive={false}
            className="!rounded-lg !border-border !bg-card !shadow-md [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-foreground"
          />
          <MiniMap
            className="!rounded-lg !border-border !bg-card hidden sm:block"
            nodeColor={() => "hsl(var(--primary))"}
            maskColor="hsl(var(--background) / 0.85)"
          />
        </ReactFlow>
      </div>

      <WorkflowNodeDetailPanel
        detail={selectedDetail}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
};
