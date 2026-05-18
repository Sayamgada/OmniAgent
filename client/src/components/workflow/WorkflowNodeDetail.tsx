import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import type { WorkflowNodeDetail } from "../../types/workflow";
import { nodeTypeStyles } from "./workflowNodeStyles";

interface WorkflowNodeDetailPanelProps {
  detail: WorkflowNodeDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailSection({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="rounded-md border border-border/50 bg-background/40 px-3 py-2 text-sm text-foreground/90"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const WorkflowNodeDetailPanel = ({
  detail,
  open,
  onOpenChange,
}: WorkflowNodeDetailPanelProps) => {
  if (!detail) return null;

  const styles = nodeTypeStyles[detail.type];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-border bg-[#121212] sm:max-w-md"
      >
        <SheetHeader>
          <Badge className={`w-fit border-0 ${styles.badge}`}>
            {detail.type.replace("_", " ")}
          </Badge>
          <SheetTitle className="text-left">{detail.label}</SheetTitle>
          {detail.subtitle && (
            <SheetDescription className="text-left text-primary/80">
              {detail.subtitle}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {detail.preview && (
            <div className="rounded-lg border border-border/60 bg-card/40 p-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{detail.preview}</p>
            </div>
          )}

          {detail.executionOrder != null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Execution order:</span>
              <span className="rounded bg-primary/15 px-2 py-0.5 text-primary">
                #{detail.executionOrder}
              </span>
            </div>
          )}

          <Separator className="bg-border/60" />

          <DetailSection title="Responsibilities" items={detail.responsibilities} />
          <DetailSection title="Inputs" items={detail.inputs} />
          <DetailSection title="Outputs" items={detail.outputs} />
          <DetailSection title="APIs & Tools" items={detail.tools} />
          <DetailSection title="Constraints" items={detail.constraints} />
          <DetailSection title="Edge Cases" items={detail.edgeCases} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
