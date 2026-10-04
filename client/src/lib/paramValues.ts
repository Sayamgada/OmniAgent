/**
 * Pure helpers for the per-step parameter form: initial values from
 * param_schema's field defs, and client-side validation/coercion into the
 * values create-workflow expects. The backend independently rejects blank
 * required values (SuppliedParamProvider), so this is for fast feedback,
 * not the only line of defence.
 */

import type { ParamField, ParamValues, StepParamForm } from "./agentsApi";

export type FieldErrors = Record<number, Record<string, string>>;
export type FormValues = Record<number, Record<string, unknown>>;

type Coerced = { ok: true; value: unknown } | { ok: false; error: string };

const hasValue = (v: unknown): boolean =>
  v !== null && v !== undefined && v !== "";

export function initialFieldValue(f: ParamField): unknown {
  switch (f.type) {
    case "boolean":
      return typeof f.default === "boolean" ? f.default : false;
    case "number":
      return hasValue(f.default) ? f.default : "";
    case "multiOptions":
      return Array.isArray(f.default) ? f.default : [];
    case "json":
      if (!hasValue(f.default)) return "";
      return typeof f.default === "string"
        ? f.default
        : JSON.stringify(f.default, null, 2);
    case "options":
      return hasValue(f.default) ? f.default : (f.options[0]?.value ?? "");
    default:
      return hasValue(f.default) ? String(f.default) : "";
  }
}

export function initialValues(forms: StepParamForm[]): FormValues {
  const out: FormValues = {};
  for (const form of forms) {
    out[form.step] = {};
    for (const f of form.fields) {
      const preset = form.bindings?.[f.name]?.find((b) => b.default);
      const isTextual = f.type === "string" || f.type === "dateTime";
      out[form.step][f.name] =
        preset && isTextual ? preset.expression : initialFieldValue(f);
    }
  }
  return out;
}

export function coerceFieldValue(f: ParamField, raw: unknown): Coerced {
  const err = (error: string): Coerced => ({ ok: false, error });
  switch (f.type) {
    case "boolean":
      return { ok: true, value: Boolean(raw) };
    case "number": {
      if (!hasValue(raw)) return err("Required");
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n)
        ? { ok: true, value: n }
        : err("Must be a number");
    }
    case "multiOptions": {
      const arr = Array.isArray(raw) ? raw : [];
      return arr.length ? { ok: true, value: arr } : err("Select at least one");
    }
    case "json": {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!s) return err("Required");
      try {
        JSON.parse(s);
      } catch {
        return err("Invalid JSON");
      }
      // Sent as the validated text: n8n json parameters hold JSON text.
      return { ok: true, value: s };
    }
    case "options":
      return hasValue(raw) ? { ok: true, value: raw } : err("Required");
    default: {
      const s = typeof raw === "string" ? raw : String(raw ?? "");
      return s.trim() ? { ok: true, value: s } : err("Required");
    }
  }
}

/** Validates every field; returns the params payload and any per-field errors. */
export function buildParams(
  forms: StepParamForm[],
  values: FormValues,
): { params: ParamValues; errors: FieldErrors; valid: boolean } {
  const params: ParamValues = {};
  const errors: FieldErrors = {};
  for (const form of forms) {
    params[form.step] = {};
    for (const f of form.fields) {
      const res = coerceFieldValue(f, values[form.step]?.[f.name]);
      if (res.ok) {
        params[form.step][f.name] = res.value;
      } else {
        (errors[form.step] ??= {})[f.name] = res.error;
      }
    }
  }
  return { params, errors, valid: Object.keys(errors).length === 0 };
}

/** Turns create-workflow's needs_user_input missing_fields into FieldErrors. */
export function errorsFromMissing(
  items: { step: number; missing_fields: string[] }[],
): FieldErrors {
  const out: FieldErrors = {};
  for (const it of items) {
    for (const name of it.missing_fields ?? []) {
      (out[it.step] ??= {})[name] = "Required";
    }
  }
  return out;
}
