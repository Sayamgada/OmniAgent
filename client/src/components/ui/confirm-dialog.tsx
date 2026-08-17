import { Loader2 } from "lucide-react";

import { cn } from "../../lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <AlertDialogContent className="glass-card rounded-2xl border-border/50 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={loading}
            className={cn(destructive && "shadow-[0_0_20px_hsl(0_84%_60%_/_0.2)]")}
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {confirmLabel}...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
