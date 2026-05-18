import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type OnNodeClick,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { GitBranch } from "lucide-react";
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

  const onNodeClick: OnNodeClick = useCallback((_, node) => {
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
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-[#121212]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-card/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-secondary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Execution Flow</p>
            <p className="text-[11px] text-muted-foreground">AI-generated workflow visualization</p>
          </div>
        </div>
        <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-[10px] font-medium text-secondary">
          Multi-Agent Orchestration
        </span>
      </div>

      <div className="relative h-[min(520px,60vh)] w-full">
        {isRendering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
          >
            <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-secondary"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                style={{ width: "40%" }}
              />
            </div>
            <p className="text-sm text-muted-foreground shimmer-text">Rendering workflow nodes…</p>
          </motion.div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges.map((e) => ({
            ...e,
            style: {
              ...e.style,
              strokeWidth: hoveredEdge === e.id ? 3 : 2,
              filter: hoveredEdge === e.id ? "drop-shadow(0 0 6px hsl(211 100% 50%))" : undefined,
            },
          }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeMouseEnter={(_, edge) => highlightNodesForEdge(edge.id)}
          onEdgeMouseLeave={() => highlightNodesForEdge(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          className="workflow-canvas"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(0 0% 20%)" />
          <Controls
            showInteractive={false}
            className="!rounded-lg !border-border !bg-card/90 !shadow-lg [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-foreground"
          />
          <MiniMap
            className="!rounded-lg !border-border !bg-card/90"
            nodeColor={() => "hsl(211 100% 50%)"}
            maskColor="hsl(0 0% 7% / 0.8)"
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
