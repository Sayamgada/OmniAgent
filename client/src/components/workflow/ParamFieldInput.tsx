import type { ReactNode } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { cn } from "../../lib/utils";
import type { Binding, ParamField } from "../../lib/agentsApi";

interface ParamFieldInputProps {
  id: string;
  field: ParamField;
  /** Upstream-data values this field can take instead of typed text. */
  bindings?: Binding[];
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

const LONG_TEXT_FIELDS = new Set([
  "message",
  "text",
  "body",
  "content",
  "prompt",
]);

/** Shape of a resourceLocator field's input modes, when the backend sends them. */
interface LocatorMode {
  name: string;
  display_name?: string;
  placeholder?: string | null;
}

/**
 * n8n parameter descriptions contain a little raw HTML (<a href>, <code>).
 * Rendered as text it shows up as literal tags, so turn the two tags we
 * expect into real elements and strip anything else. Built from React
 * nodes (never dangerouslySetInnerHTML) and links are limited to http(s).
 */
const stripTags = (t: string) => t.replace(/<[^>]+>/g, "");

const renderDescription = (text: string): ReactNode => {
  const token = /<a\s+([^>]*)>([\s\S]*?)<\/a>|<code>([\s\S]*?)<\/code>/gi;
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = token.exec(text)) !== null) {
    if (m.index > last) out.push(stripTags(text.slice(last, m.index)));
    if (m[1] !== undefined) {
      const href = /href\s*=\s*['"]([^'"]+)['"]/i.exec(m[1])?.[1];
      const label = stripTags(m[2] ?? "");
      out.push(
        href && /^https?:\/\//i.test(href) ? (
          <a
            key={key++}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            {label}
          </a>
        ) : (
          label
        ),
      );
    } else {
      out.push(
        <code key={key++} className="rounded bg-muted px-1">
          {stripTags(m[3] ?? "")}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(stripTags(text.slice(last)));
  return out;
};

const controlClass =
  "w-full rounded-md border border-border/80 bg-card/70 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export const ParamFieldInput = ({
  id,
  field,
  bindings,
  value,
  onChange,
  error,
  disabled,
}: ParamFieldInputProps) => {
  // An object value (e.g. an n8n resource locator {mode, value}) must never be
  // stringified -- show its inner text value instead.
  const raw =
    value && typeof value === "object" && "value" in (value as object)
      ? (value as { value?: unknown }).value
      : value;
  const str =
    typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
  const isTextField = field.type === "string" || field.type === "dateTime";
  // A string value starting with "=" is an n8n expression (bound to upstream data).
  const isBound =
    isTextField && typeof value === "string" && value.startsWith("=");
  const matched = isBound
    ? bindings?.find((b) => b.expression === value)
    : undefined;

  let control: JSX.Element;
  switch (field.type) {
    case "boolean":
      control = (
        <label className="flex items-center gap-2 text-sm">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="text-muted-foreground">Enabled</span>
        </label>
      );
      break;

    case "options":
      control = (
        <select
          id={id}
          className={cn(controlClass, "h-10")}
          value={String(value ?? "")}
          disabled={disabled}
          onChange={(e) => {
            const picked = field.options.find(
              (o) => String(o.value) === e.target.value,
            );
            onChange(picked ? picked.value : e.target.value);
          }}
        >
          {field.options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;

    case "multiOptions": {
      const selected = Array.isArray(value) ? value : [];
      control = (
        <div className="space-y-1">
          {field.options.map((o) => (
            <label
              key={String(o.value)}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, o.value]
                      : selected.filter((v) => v !== o.value),
                  )
                }
              />
              {o.label}
            </label>
          ))}
        </div>
      );
      break;
    }

    case "resourceLocator": {
      // The user types or pastes one value (a URL, an ID or a name); the
      // compiler works out which n8n locator mode it is.
      const modes = (
        (field as ParamField & { modes?: LocatorMode[] }).modes ?? []
      ).filter((m) => m.name !== "list");
      const hint = modes.length
        ? `Accepts: ${modes.map((m) => m.display_name ?? m.name).join(", ")}`
        : undefined;
      control = (
        <div className="space-y-1">
          <Input
            id={id}
            value={str}
            placeholder={
              modes.find((m) => m.placeholder)?.placeholder ??
              field.placeholder ??
              undefined
            }
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="border-border/80 bg-card/70 focus-visible:ring-primary"
          />
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      );
      break;
    }

    case "number":
      control = (
        <Input
          id={id}
          type="number"
          value={str}
          placeholder={field.placeholder ?? undefined}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="border-border/80 bg-card/70 focus-visible:ring-primary"
        />
      );
      break;

    case "json":
      control = (
        <Textarea
          id={id}
          value={str}
          placeholder={field.placeholder ?? "{ }"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[100px] border-border/80 bg-card/70 font-mono text-xs focus-visible:ring-primary"
        />
      );
      break;

    default:
      if (field.type !== "string" && field.type !== "dateTime") {
        console.warn(
          `ParamFieldInput: unhandled field type "${field.type}" for "${field.name}", rendering as text`,
        );
      }
      control = LONG_TEXT_FIELDS.has(field.name) ? (
        <Textarea
          id={id}
          value={str}
          placeholder={field.placeholder ?? undefined}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[110px] border-border/80 bg-card/70 focus-visible:ring-primary"
        />
      ) : (
        <Input
          id={id}
          value={str}
          placeholder={field.placeholder ?? undefined}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="border-border/80 bg-card/70 focus-visible:ring-primary"
        />
      );
  }

  if (isBound) {
    control = (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2">
        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
          {matched?.label ?? "Custom expression"}
        </span>
        <code className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {str}
        </code>
        <button
          type="button"
          disabled={disabled}
          className="text-xs text-primary underline-offset-2 hover:underline"
          onClick={() => onChange("")}
        >
          Type a value instead
        </button>
      </div>
    );
  }

  const offered = isTextField && !isBound ? (bindings ?? []) : [];

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {field.display_name}
        {field.required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {control}
      {offered.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {offered.map((b) => (
            <button
              key={b.expression}
              type="button"
              disabled={disabled}
              className="rounded-full border border-primary/40 px-2 py-0.5 text-xs text-primary hover:bg-primary/10"
              onClick={() => onChange(b.expression)}
            >
              Use: {b.label}
            </button>
          ))}
        </div>
      )}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : field.description ? (
        <p className="text-xs text-muted-foreground">
          {renderDescription(field.description)}
        </p>
      ) : null}
    </div>
  );
};
