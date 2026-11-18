import { useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === "password";
  const effectiveType = isPasswordField && showPassword ? "text" : type;

  const hasError = Boolean(error);
  const ok = Boolean(showSuccess && !hasError && value.trim().length > 0);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          "group relative flex items-center rounded-xl border bg-background/80 backdrop-blur-xs transition-all duration-200",
          "border-border/80 hover:border-border",
          hasError && "border-destructive/90 focus-within:border-destructive focus-within:ring-2 focus-within:ring-destructive/20",
          ok && "border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          !hasError && !ok && "focus-within:border-primary/80 focus-within:ring-2 focus-within:ring-primary/20",
        )}
      >
        <Icon
          className={cn(
            "pointer-events-none absolute left-3.5 size-[18px] transition-colors",
            hasError
              ? "text-destructive"
              : ok
              ? "text-primary"
              : "text-muted-foreground group-focus-within:text-primary",
          )}
        />
        <input
          id={id}
          type={effectiveType}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          placeholder=" "
          className={cn(
            "peer h-13.5 w-full rounded-xl bg-transparent pl-11 pb-2 pt-5 text-sm text-foreground",
            isPasswordField ? "pr-11" : "pr-4",
            "placeholder-transparent focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        <span
          className={cn(
            "pointer-events-none absolute left-11 top-1/2 origin-left -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200 select-none",
            "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm",
            "peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:text-primary",
            "peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold",
            hasError && "text-destructive peer-focus:text-destructive peer-[:not(:placeholder-shown)]:text-destructive",
            ok && "text-muted-foreground peer-focus:text-primary peer-[:not(:placeholder-shown)]:text-muted-foreground",
          )}
        >
          {label}
        </span>

        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3.5 p-1 rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors cursor-pointer"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        )}
      </div>
      {error ? (
        <p className="animate-in fade-in text-xs font-medium text-destructive duration-150 pl-1">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default AuthInputField;
