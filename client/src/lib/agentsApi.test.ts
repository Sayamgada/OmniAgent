import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  checkIntegrations,
  createWorkflow,
  deactivateAgent,
  deleteAgent,
  detailToMessage,
  extractWorkflow,
  isStaleAgentError,
  isStaleNameClash,
  listAgents,
  requiredIntegrationsOf,
  setN8nGateHandler,
} from "./agentsApi";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
  setN8nGateHandler(null);
});

describe("detailToMessage", () => {
  it("passes plain string details through", () => {
    expect(detailToMessage("Agent not found", "fb")).toBe("Agent not found");
  });

  it("joins FastAPI 422 messages", () => {
    const detail = [{ msg: "field required" }, { msg: "too short" }];
    expect(detailToMessage(detail, "fb")).toBe("field required; too short");
  });

  it("reads `message` from a structured detail (409 agent_name_taken)", () => {
    const detail = {
      code: "agent_name_taken",
      message: "Name taken",
      agent_id: "a1",
    };
    expect(detailToMessage(detail, "fb")).toBe("Name taken");
  });

  it("falls back when there is nothing usable", () => {
    expect(detailToMessage({ code: "x" }, "fb")).toBe("fb");
    expect(detailToMessage(undefined, "fb")).toBe("fb");
  });
});

describe("request error handling", () => {
  it("surfaces the 409 code and message instead of 'Request failed (409)'", async () => {
    const detail = {
      code: "agent_name_taken",
      message: "You already have an agent with this name.",
      agent_id: "a1",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ detail }, 409)));

    const err = await createWorkflow("tok", "auto", {
      params: {},
      overrides: {},
      workflow_name: "Dup",
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    const apiErr = err as ApiError;
    expect(apiErr.status).toBe(409);
    expect(apiErr.code).toBe("agent_name_taken");
    expect(apiErr.message).toBe("You already have an agent with this name.");
  });

  it("leaves `code` undefined for string details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json({ detail: "boom" }, 502)),
    );
    const err = (await deleteAgent("tok", "a1").catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(err.message).toBe("boom");
    expect(err.code).toBeUndefined();
  });
});

describe("lifecycle endpoints", () => {
  it("deleteAgent resolves on a 204 with no body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(deleteAgent("tok", "a1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });

  it("listAgents unwraps {agents} and adds ?refresh=true only when asked", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => json({ agents: [{ id: "a1" }] }, 200));
    vi.stubGlobal("fetch", fetchMock);

    expect(await listAgents("tok")).toEqual([{ id: "a1" }]);
    await listAgents("tok", true);

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/agents$/);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(
      /\/agents\?refresh=true$/,
    );
  });
});

describe("extractWorkflow edit loop", () => {
  const sentBody = (fetchMock: ReturnType<typeof vi.fn>) =>
    JSON.parse(fetchMock.mock.calls[0][1].body as string);

  it("sends edit_of when revising a workflow", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () =>
        json(
          { workflow: {}, integrations: [], all_required_available: true },
          200,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await extractWorkflow("tok", {
      domain: "Corporate",
      description: "edited prompt",
      edit_of: "Morning Gmail Summary to Slack",
    });

    expect(sentBody(fetchMock)).toMatchObject({
      domain: "Corporate",
      description: "edited prompt",
      edit_of: "Morning Gmail Summary to Slack",
      top_k: 5,
    });
  });

  it("omits edit_of entirely for a normal request", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () =>
        json(
          { workflow: {}, integrations: [], all_required_available: true },
          200,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await extractWorkflow("tok", {
      domain: "Corporate",
      description: "first prompt",
    });

    expect("edit_of" in sentBody(fetchMock)).toBe(false);
  });
});

describe("integration re-check", () => {
  it("requiredIntegrationsOf keeps only service/display_name/required and drops junk", () => {
    const workflow = {
      required_integrations: [
        {
          service: "gmail",
          display_name: "Gmail",
          required: true,
          available: true,
        },
        { service: "slack", required: false },
        { display_name: "no service" },
        "not an object",
        null,
      ],
    };
    expect(requiredIntegrationsOf(workflow)).toEqual([
      { service: "gmail", display_name: "Gmail", required: true },
      { service: "slack", display_name: null, required: false },
    ]);
  });

  it("requiredIntegrationsOf is empty when the workflow has none", () => {
    expect(requiredIntegrationsOf(null)).toEqual([]);
    expect(requiredIntegrationsOf({})).toEqual([]);
    expect(requiredIntegrationsOf({ required_integrations: "x" })).toEqual([]);
  });

  it("checkIntegrations posts the list and maps connected -> available", async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      json(
        {
          integrations: [
            {
              service: "gmail",
              display_name: "Gmail",
              required: true,
              connected: true,
            },
            {
              service: "slack",
              display_name: null,
              required: true,
              connected: false,
            },
          ],
          all_required_available: false,
        },
        200,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await checkIntegrations("tok", [
      { service: "gmail", display_name: "Gmail", required: true },
      { service: "slack", display_name: null, required: true },
    ]);

    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/integrations\/check$/,
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      required_integrations: [
        { service: "gmail", display_name: "Gmail", required: true },
        { service: "slack", display_name: null, required: true },
      ],
    });
    expect(res.all_required_available).toBe(false);
    expect(res.integrations).toEqual([
      {
        service: "gmail",
        display_name: "Gmail",
        required: true,
        available: true,
      },
      {
        service: "slack",
        display_name: "slack",
        required: true,
        available: false,
      },
    ]);
  });
});

const NOT_CONFIGURED = {
  detail: { code: "n8n_not_configured", message: "Connect your n8n first." },
};

describe("n8n gate (409 n8n_not_configured)", () => {
  it("prompts once, then retries the original request and returns its result", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(NOT_CONFIGURED, 409))
      .mockResolvedValueOnce(json({ agents: [{ id: "a1" }] }, 200));
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn().mockResolvedValue(true);
    setN8nGateHandler(handler);

    expect(await listAgents("tok")).toEqual([{ id: "a1" }]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws the original error, with no retry, when the user does not connect", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(NOT_CONFIGURED, 409));
    vi.stubGlobal("fetch", fetchMock);
    setN8nGateHandler(vi.fn().mockResolvedValue(false));

    const err = (await listAgents("tok").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("n8n_not_configured");
    expect(err.message).toBe("Connect your n8n first.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not loop: a second 409 after the retry is thrown", async () => {
    // fresh Response per call: a body can only be read once
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => json(NOT_CONFIGURED, 409));
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn().mockResolvedValue(true);
    setN8nGateHandler(handler);

    const err = (await listAgents("tok").catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe("n8n_not_configured");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws immediately when no handler is registered", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(NOT_CONFIGURED, 409));
    vi.stubGlobal("fetch", fetchMock);

    const err = (await listAgents("tok").catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe("n8n_not_configured");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a handler that throws as 'not connected'", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(NOT_CONFIGURED, 409));
    vi.stubGlobal("fetch", fetchMock);
    setN8nGateHandler(vi.fn().mockRejectedValue(new Error("modal crashed")));

    const err = (await listAgents("tok").catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe("n8n_not_configured");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("concurrent 409s share a single prompt", async () => {
    let n = 0;
    const fetchMock = vi.fn().mockImplementation(async () =>
      // first two calls (the concurrent originals) fail; the retries succeed
      ++n <= 2 ? json(NOT_CONFIGURED, 409) : json({ agents: [] }, 200),
    );
    vi.stubGlobal("fetch", fetchMock);
    let release!: (ok: boolean) => void;
    const handler = vi
      .fn()
      .mockImplementation(
        () => new Promise<boolean>((resolve) => (release = resolve)),
      );
    setN8nGateHandler(handler);

    const a = listAgents("tok");
    const b = listAgents("tok");
    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
    release(true);

    expect(await Promise.all([a, b])).toEqual([[], []]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("does not prompt for other 409 codes (agent_stale)", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          json({ detail: { code: "agent_stale", message: "Old n8n." } }, 409),
        ),
    );
    const handler = vi.fn().mockResolvedValue(true);
    setN8nGateHandler(handler);

    const err = await deactivateAgent("tok", "a1").catch((e: unknown) => e);
    expect(isStaleAgentError(err)).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("stale helpers", () => {
  const clash = (stale: unknown) =>
    new ApiError("Name taken", 409, {
      code: "agent_name_taken",
      message: "Name taken",
      agent_id: "a1",
      ...(stale === undefined ? {} : { stale }),
    });

  it("isStaleNameClash is true only for agent_name_taken with stale: true", () => {
    expect(isStaleNameClash(clash(true))).toBe(true);
    expect(isStaleNameClash(clash(false))).toBe(false);
    expect(isStaleNameClash(clash(undefined))).toBe(false);
    expect(isStaleNameClash(clash("true"))).toBe(false);
  });

  it("isStaleNameClash ignores other errors", () => {
    expect(
      isStaleNameClash(
        new ApiError("x", 409, { code: "agent_stale", stale: true }),
      ),
    ).toBe(false);
    expect(isStaleNameClash(new Error("boom"))).toBe(false);
    expect(isStaleNameClash(null)).toBe(false);
  });

  it("isStaleAgentError matches only agent_stale", () => {
    expect(
      isStaleAgentError(new ApiError("x", 409, { code: "agent_stale" })),
    ).toBe(true);
    expect(isStaleAgentError(new ApiError("x", 409, { code: "other" }))).toBe(
      false,
    );
    expect(isStaleAgentError("agent_stale")).toBe(false);
  });
});
