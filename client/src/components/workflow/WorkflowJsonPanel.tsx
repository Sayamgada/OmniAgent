import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check, FileCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "../../lib/utils";
import { JsonSyntaxHighlight } from "./JsonSyntaxHighlight";
import { toast } from "sonner";

interface WorkflowJsonPanelProps {
  formattedJson: string;
  isValidJson: boolean;
}

export const WorkflowJsonPanel = ({ formattedJson, isValidJson }: WorkflowJsonPanelProps) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      toast.success("JSON IR schema copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy JSON");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <FileCode className="size-4 text-primary" />
            <span className="font-mono text-xs font-semibold text-foreground">workflow_ir_schema.json</span>
          </div>
          {!isValidJson && (
            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-400">
              Raw String Output
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-background/60"
          >
            {copied ? (
              <>
                <Check className="size-3 text-secondary" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3" />
                Copy JSON
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded((v) => !v)}
            className="size-7 text-muted-foreground hover:text-foreground"
            aria-label={expanded ? "Collapse JSON view" : "Expand JSON view"}
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-background/80"
          >
            <ScrollArea className={cn("h-[min(480px,55vh)] w-full")}>
              <div className="p-4 text-xs font-mono">
                <JsonSyntaxHighlight code={formattedJson} />
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
