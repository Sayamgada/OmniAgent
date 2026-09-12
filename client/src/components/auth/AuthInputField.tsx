import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export type AuthInputFieldProps = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  icon: LucideIcon;
  error?: string;
  showSuccess?: boolean;
  disabled?: boolean;
};

const AuthInputField = ({
  id,
  label,
  type = "text",
  autoComplete,
  value,
  onChange,
  onBlur,
  icon: Icon,
  error,
  showSuccess,
  disabled,
}: AuthInputFieldProps) => {
  const hasError = Boolean(error);
  const ok = Boolean(showSuccess && !hasError && value.trim().length > 0);

  return (
    <div className="space-y-1.5 text-left">
      <label htmlFor={id} className="block text-xs font-medium text-foreground">
        {label}
      </label>
      <div
        className={cn(
          "relative flex items-center rounded-lg border bg-background/60 transition-colors",
          "border-border",
          hasError && "border-destructive ring-1 ring-destructive/30",
          ok && "border-secondary/60",
          !hasError && !ok && "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40",
        )}
      >
        <div className="pointer-events-none absolute left-3 flex items-center justify-center">
          <Icon
            className={cn(
              "size-4 transition-colors",
              hasError ? "text-destructive" : ok ? "text-secondary" : "text-muted-foreground",
            )}
          />
        </div>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={`Enter your ${label.toLowerCase()}`}
          className={cn(
            "h-10 w-full rounded-lg bg-transparent pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60",
            "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
};

export default AuthInputField;
