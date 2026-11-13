import { useEffect, useState } from "react";
import { Cpu, Loader2 } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { AIProvider, AISelection } from "../../lib/agentsApi";

// Value of the model <select> entry that switches to a free-text model ID.
const CUSTOM = "__custom__";

const selectClass =
  "h-9 w-full rounded-md border border-border/80 bg-card/70 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

interface Props {
  providers: AIProvider[];
  selection: AISelection;
  /** The user's saved default, to tell whether "Set as default" does anything. */
  savedDefault: AISelection | null;
  /** A selection request is in flight. */
  busy: boolean;
  savingDefault: boolean;
  disabled?: boolean;
  onChange: (provider: string, model: string) => void;
  onSaveDefault: (provider: string, model: string) => void;
}

/**
 * Provider + model picker for the AI step of a generated workflow (Task B).
 * Shown on the Preview Screen only when the workflow has an AI step. Every
 * change goes to the server (onChange), which rewrites the preview and
 * re-checks connections; this component keeps no selection of its own beyond
 * the half-typed custom model ID.
 */
export function AIProviderPicker({
  providers,
  selection,
  savedDefault,
  busy,
  savingDefault,
  disabled = false,
  onChange,
  onSaveDefault,
}: Props) {
  const provider = providers.find((p) => p.service === selection.provider);
  const curated = provider?.models ?? [];
  const isCustomModel = !curated.includes(selection.model);

  const [customMode, setCustomMode] = useState(isCustomModel);
  const [customText, setCustomText] = useState(
    isCustomModel ? selection.model : "",
  );

  // Follow the server's selection (provider switch, edit loop, failed request).
  useEffect(() => {
    const custom = !curated.includes(selection.model);
    setCustomMode(custom);
    setCustomText(custom ? selection.model : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.provider, selection.model]);

  const locked = disabled || busy;
  const isDefault =
    savedDefault !== null &&
    savedDefault.provider === selection.provider &&
    savedDefault.model === selection.model;

  const handleProvider = (key: string) => {
    const next = providers.find((p) => p.service === key);
    if (!next || key === selection.provider) return;
    onChange(key, next.default_model);
  };

  const handleModel = (value: string) => {
    if (value === CUSTOM) {
      setCustomMode(true);
      setCustomText("");
      return;
    }
    setCustomMode(false);
    if (value !== selection.model) onChange(selection.provider, value);
  };

  const applyCustom = () => {
    const model = customText.trim();
    if (!model || model === selection.model) return;
    onChange(selection.provider, model);
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-primary" />
          <h3 className="font-semibold">AI model for this agent</h3>
        </div>
        {busy && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Updating...
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        The AI step of this workflow runs on the provider and model you pick
        here. Changing it does not regenerate the workflow; it only re-checks
        which connection the agent needs.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ai-provider">Provider</Label>
          <select
            id="ai-provider"
            className={selectClass}
            value={selection.provider}
            disabled={locked}
            onChange={(e) => handleProvider(e.target.value)}
          >
            {providers.map((p) => (
              <option key={p.service} value={p.service} disabled={!p.available}>
                {p.display_name}
                {p.available
                  ? p.connected
                    ? " (connected)"
                    : " (not connected)"
                  : " (unavailable)"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-model">Model</Label>
          <select
            id="ai-model"
            className={selectClass}
            value={customMode ? CUSTOM : selection.model}
            disabled={locked}
            onChange={(e) => handleModel(e.target.value)}
          >
            {curated.map((m) => (
              <option key={m} value={m}>
                {m}
                {m === provider?.default_model ? " (default)" : ""}
              </option>
            ))}
            {(provider?.allow_custom_model ?? true) && (
              <option value={CUSTOM}>Custom model ID...</option>
            )}
          </select>
        </div>
      </div>

      {customMode && (
        <div className="space-y-2">
          <Label htmlFor="ai-model-custom">Custom model ID</Label>
          <div className="flex gap-2">
            <Input
              id="ai-model-custom"
              value={customText}
              disabled={locked}
              placeholder={provider?.default_model ?? "model-id"}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyCustom();
              }}
              className="border-border/80 bg-card/70 focus-visible:ring-primary"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={
                locked ||
                !customText.trim() ||
                customText.trim() === selection.model
              }
              onClick={applyCustom}
            >
              Use model
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use the exact ID from the provider, as shown in n8n's model list.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {isDefault
            ? "This is your default for new agents."
            : "New agents start with your default provider and model."}
        </p>
        {!isDefault && (
          <Button
            variant="outline"
            size="sm"
            disabled={locked || savingDefault}
            onClick={() => onSaveDefault(selection.provider, selection.model)}
          >
            {savingDefault ? "Saving..." : "Set as my default"}
          </Button>
        )}
      </div>
    </div>
  );
}
