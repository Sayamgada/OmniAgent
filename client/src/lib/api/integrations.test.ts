import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, setN8nGateHandler } from "../agentsApi";
import {
  checkOAuthStatus,
  connectOAuthInit,
  connectTextFields,
  deleteIntegration,
  fetchIntegrations,
} from "./integrations";
import { connectN8n, disconnectN8n, getN8nStatus } from "./n8n";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
  setN8nGateHandler(null);
});

const NOT_CONFIGURED = {
  detail: { code: "n8n_not_configured", message: "Connect your n8n first." },
};

describe("n8n settings client", () => {
  it("getN8nStatus GETs /users/me/n8n with the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json(
        {
          configured: true,
          base_url: "http://localhost:5678",
          oauth_callback_url:
            "http://localhost:5678/rest/oauth2-credential/callback",
        },
        200,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const status = await getN8nStatus("tok");

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/users\/me\/n8n$/);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
    expect(status.oauth_callback_url).toBe(
      "http://localhost:5678/rest/oauth2-credential/callback",
    );
  });

  it("connectN8n PUTs the four fields", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ configured: true }, 200));
    vi.stubGlobal("fetch", fetchMock);
    const body = {
      base_url: "http://localhost:5678",
      api_key: "k",
      email: "me@example.com",
      password: "pw",
    };

    await connectN8n("tok", body);

    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual(body);
  });

  it("connectN8n surfaces the backend's user-facing 400 message", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(json({ detail: "n8n rejected the API key." }, 400)),
    );
    const err = (await connectN8n("tok", {
      base_url: "x",
      api_key: "k",
      email: "e",
      password: "p",
    }).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("n8n rejected the API key.");
  });

  it("disconnectN8n sends DELETE", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ configured: false }, 200));
    vi.stubGlobal("fetch", fetchMock);
    await disconnectN8n("tok");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });
});

describe("integrations client (shared request)", () => {
  it("fetchIntegrations passes `stale` through", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          json(
            [
              {
                service: "gmail",
                connected: false,
                configured: true,
                stale: true,
              },
            ],
            200,
          ),
        ),
    );
    const items = await fetchIntegrations("tok");
    expect(items[0].stale).toBe(true);
  });

  it("a structured 409 gives a readable message, not [object Object]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json(NOT_CONFIGURED, 409)),
    );
    const err = (await connectTextFields("tok", "groq", "api_key", {}).catch(
      (e: unknown) => e,
    )) as Error;
    expect(err.message).toBe("Connect your n8n first.");
  });

  it("connectTextFields retries after the user connects n8n", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(NOT_CONFIGURED, 409))
      .mockResolvedValueOnce(
        json(
          {
            service: "groq",
            auth_option: "api_key",
            connected: true,
            n8n_credential_id: "c1",
          },
          200,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    setN8nGateHandler(vi.fn().mockResolvedValue(true));

    const res = await connectTextFields("tok", "groq", "api_key", {
      apiKey: "k",
    });

    expect(res.connected).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({
      service: "groq",
      option_id: "api_key",
      values: { apiKey: "k" },
    });
  });

  it("connectOAuthInit returns the per-user oauth_callback_url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json(
          {
            service: "gmail",
            auth_option: "oauth2",
            n8n_credential_id: "c1",
            authorization_url: "https://accounts.google.com/x",
            oauth_callback_url:
              "http://localhost:5679/rest/oauth2-credential/callback",
          },
          200,
        ),
      ),
    );
    const res = await connectOAuthInit(
      "tok",
      "gmail",
      "oauth2",
      "id",
      "secret",
    );
    expect(res.oauth_callback_url).toBe(
      "http://localhost:5679/rest/oauth2-credential/callback",
    );
  });

  it("checkOAuthStatus never opens the connect prompt (it is polled)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json(NOT_CONFIGURED, 409)),
    );
    const handler = vi.fn().mockResolvedValue(true);
    setN8nGateHandler(handler);

    const err = (await checkOAuthStatus("tok", "gmail").catch(
      (e: unknown) => e,
    )) as ApiError;

    expect(err.code).toBe("n8n_not_configured");
    expect(handler).not.toHaveBeenCalled();
  });

  it("deleteIntegration DELETEs the service path", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ service: "gmail", disconnected: true }, 200));
    vi.stubGlobal("fetch", fetchMock);
    await deleteIntegration("tok", "gmail");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/integrations\/gmail$/,
    );
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });
});
