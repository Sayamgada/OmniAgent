import { CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "../ui/card";
import type { StepParamForm } from "../../lib/agentsApi";
import type { FieldErrors, FormValues } from "../../lib/paramValues";
import { ParamFieldInput } from "./ParamFieldInput";

interface ConfigureWorkflowStepProps {
  forms: StepParamForm[];
  values: FormValues;
  errors: FieldErrors;
  onChange: (step: number, name: string, value: unknown) => void;
  disabled?: boolean;
}

/** Presentational: the parent owns values/errors and does the submitting. */
export const ConfigureWorkflowStep = ({
  forms,
  values,
  errors,
  onChange,
  disabled,
}: ConfigureWorkflowStepProps) => {
  if (forms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <CheckCircle2 className="size-8 text-secondary" />
        <p className="text-sm font-medium">No extra details needed</p>
        <p className="text-xs text-muted-foreground">
          Every step is ready. Create the agent to deploy it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Configure your agent</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details each step needs before it can run.
        </p>
      </div>

      {forms.map((form) => (
        <Card key={form.step} className="border-border/70 bg-card/60">
          <CardContent className="space-y-4 p-4">
            <p className="text-sm font-semibold">
              Step {form.step}: {form.display_label}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {form.fields.map((field) => (
                <div
                  key={field.name}
                  className={
                    field.type === "json" || field.name === "message"
                      ? "md:col-span-2"
                      : undefined
                  }
                >
                  <ParamFieldInput
                    id={`step-${form.step}-${field.name}`}
                    field={field}
                    bindings={form.bindings?.[field.name]}
                    value={values[form.step]?.[field.name]}
                    error={errors[form.step]?.[field.name]}
                    disabled={disabled}
                    onChange={(v) => onChange(form.step, field.name, v)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
