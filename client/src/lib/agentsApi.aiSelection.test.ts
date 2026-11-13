import { describe, expect, it } from "vitest";

import { aiSelectionOf } from "./agentsApi";

describe("aiSelectionOf", () => {
  it("reads the selection the server applied", () => {
    expect(
      aiSelectionOf({
        ai_selection: { provider: "gemini", model: "gemini-3-flash-preview" },
      }),
    ).toEqual({ provider: "gemini", model: "gemini-3-flash-preview" });
  });

  it("is null for a workflow without an AI step", () => {
    expect(aiSelectionOf({ automation_name: "x" })).toBeNull();
    expect(aiSelectionOf(null)).toBeNull();
  });

  it("is null for malformed values", () => {
    expect(aiSelectionOf({ ai_selection: "groq" })).toBeNull();
    expect(aiSelectionOf({ ai_selection: [] })).toBeNull();
    expect(aiSelectionOf({ ai_selection: { provider: "groq" } })).toBeNull();
    expect(
      aiSelectionOf({ ai_selection: { provider: "", model: "m" } }),
    ).toBeNull();
  });
});
