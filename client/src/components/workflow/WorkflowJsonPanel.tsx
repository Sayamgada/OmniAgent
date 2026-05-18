import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
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
      toast.success("JSON copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy JSON");
    }
  };

  return (
    <motion.div className="overflow-hidden rounded-xl border border-border/80 bg-[#1a1a1a]">
      <motion.div className="flex items-center justify-between gap-3 border-b border-border/60 bg-card/80 px-4 py-3">
        <motion.div className="flex flex-wrap items-center gap-2">
          <motion.div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            <h3 className="text-sm font-semibold text-foreground">Generated Agent Configuration</h3>
          </motion.div>
          {!isValidJson && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
              Raw output — JSON parse unavailable
            </span>
          )}
        </motion.div>
        <motion.div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            {copied ? (<><Check className="size-3.5 text-secondary" />Copied</>) : (<><Copy className="size-3.5" />Copy JSON</>)}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setExpanded((v) => !v)} className="size-8 text-muted-foreground">
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </motion.div>
      </motion.div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <ScrollArea className={cn("h-[min(420px,50vh)] w-full")}>
              <motion.div className="p-4">
                <JsonSyntaxHighlight code={formattedJson} />
              </motion.div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
