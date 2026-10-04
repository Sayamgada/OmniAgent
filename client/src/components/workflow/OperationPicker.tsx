import { AlertTriangle } from "lucide-react";

import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import type { Overrides, UnresolvedStep } from "../../lib/agentsApi";

interface OperationPickerProps {
  items: UnresolvedStep[];
  picks: Overrides;
  onPick: (step: number, operation: string) => void;
  onContinue: () => void;
  onBack: () => void;
  busy?: boolean;
}

/**
 * Lets the user choose one real operation for each step the compiler could
 * not resolve on its own. The pick is sent back as overrides[step].operation.
 */
export const OperationPicker = ({
  items,
  picks,
  onPick,
  onContinue,
  onBack,
  busy,
}: OperationPickerProps) => {
  const pickable = items.filter((u) => u.candidates.length > 0);
  const stuck = items.filter((u) => u.candidates.length === 0);
  const allPicked = pickable.every((u) => Boolean(picks[u.step]?.operation));

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-2 text-amber-500">
        <AlertTriangle className="size-4" />
        <p className="text-sm font-semibold">
          Some steps need a decision before they can be built
        </p>
      </div>

      {pickable.map((u) => (
        <div
          key={u.step}
          className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-4"
        >
          <p className="text-sm font-semibold">
            Step {u.step} ({u.service}): what should this step do?
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {u.candidates.map((c) => {
              const selected = picks[u.step]?.operation === c.value;
              return (
                <label
                  key={c.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border/60 bg-background/40 hover:border-primary/40",
                  )}
                >
                  <input
                    type="radio"
                    name={`pick-step-${u.step}`}
                    className="mt-1"
                    checked={selected}
                    disabled={busy}
                    onChange={() => onPick(u.step, c.value)}
                  />
                  <span>
                    <span className="font-medium">{c.label}</span>
                    {c.action && (
                      <span className="block text-xs text-muted-foreground">
                        {c.action}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {stuck.map((u) => (
        <p
          key={u.step}
          className="rounded-lg border border-border/60 bg-card/60 p-3 text-sm text-muted-foreground"
        >
          Step {u.step} ({u.service}): {u.reason}. There are no choices to pick
          from. Go back and adjust your description.
        </p>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={busy}>
          Back to preview
        </Button>
        <Button
          onClick={onContinue}
          disabled={busy || !allPicked || pickable.length === 0}
        >
          {busy ? "Checking..." : "Continue"}
        </Button>
      </div>
    </div>
  );
};
