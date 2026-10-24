import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  checkIntegrations,
  createWorkflow,
  deleteAgent,
  detailToMessage,
  extractWorkflow,
  listAgents,
  requiredIntegrationsOf,
} from "./agentsApi";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => vi.unstubAllGlobals());

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
