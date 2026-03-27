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
    <div className="space-y-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          "group relative flex items-center rounded-xl border bg-[#1E1E1E]/90 backdrop-blur-sm transition-all duration-300",
          "border-[#2A2A2A]",
          hasError && "border-destructive shadow-[0_0_0_1px_hsl(var(--destructive)/0.45)]",
          ok && "border-secondary shadow-[0_0_20px_hsl(122_39%_49%_/_0.12)]",
          !hasError && !ok && "focus-within:border-[#007BFF] focus-within:shadow-[0_0_24px_hsl(211_100%_50%_/_0.18)]",
        )}
      >
        <Icon
          className={cn(
            "pointer-events-none absolute left-3.5 size-[18px] transition-colors",
            hasError ? "text-destructive" : ok ? "text-secondary" : "text-muted-foreground group-focus-within:text-[#007BFF]",
          )}
        />
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          placeholder=" "
          className={cn(
            "peer h-14 w-full rounded-xl bg-transparent pl-11 pr-4 pb-2.5 pt-5 text-sm text-[#F5F5F5]",
            "placeholder-transparent focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        <span
          className={cn(
            "pointer-events-none absolute left-11 top-1/2 origin-left -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200",
            "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm",
            "peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:text-[#007BFF]",
            "peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px]",
            hasError && "text-destructive peer-focus:text-destructive peer-[:not(:placeholder-shown)]:text-destructive",
            ok && "text-secondary peer-focus:text-secondary peer-[:not(:placeholder-shown)]:text-secondary",
          )}
        >
          {label}
        </span>
      </div>
      {error ? <p className="animate-in fade-in text-xs text-destructive duration-200">{error}</p> : null}
    </div>
  );
};

export default AuthInputField;
