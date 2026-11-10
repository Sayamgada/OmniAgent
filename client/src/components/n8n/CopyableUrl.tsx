import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

type CopyableUrlProps = { value: string; className?: string };

/** A read-only URL with a copy button (e.g. the user's OAuth redirect URI). */
export function CopyableUrl({ value, className }: CopyableUrlProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-2",
        className,
      )}
    >
      <code className="min-w-0 flex-1 select-all break-all text-xs">
        {value}
      </code>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 gap-1.5"
        onClick={() => void copy()}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
