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
      <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-foreground/90 font-mono"
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
        className="w-full overflow-y-auto border-border bg-card sm:max-w-md"
      >
        <SheetHeader className="text-left space-y-2">
          <Badge className={`w-fit font-mono text-[10px] ${styles.badge}`}>
            {detail.type.replace("_", " ")}
          </Badge>
          <SheetTitle className="text-base font-bold text-foreground">{detail.label}</SheetTitle>
          {detail.subtitle && (
            <SheetDescription className="text-xs text-primary font-medium">
              {detail.subtitle}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {detail.preview && (
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">{detail.preview}</p>
            </div>
          )}

          {detail.executionOrder != null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Execution order:</span>
              <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-primary font-semibold">
                #{detail.executionOrder}
              </span>
            </div>
          )}

          <Separator className="bg-border" />

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
