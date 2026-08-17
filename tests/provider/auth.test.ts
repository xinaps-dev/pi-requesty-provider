import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequestyAuth } from "../../src/provider/auth.js";
import {
  DEFAULT_BASE_URL,
  DEFAULT_EU_BASE_URL,
  REQUESTY_ENDPOINTS,
} from "../../src/provider/constants.js";
import * as client from "../../src/provider/client.js";

describe("createRequestyAuth - login", () => {
  const auth = createRequestyAuth();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("successfully logs in with US (Global) endpoint", async () => {
    vi.spyOn(client, "validateApiKey").mockResolvedValue(true);
    vi.spyOn(client, "fetchRequestyModels").mockResolvedValue({
      data: [{ id: "model-1", created: 0, object: "model", owned_by: "requesty" }],
      object: "list",
    });

    const promptMock = vi
      .fn()
      .mockResolvedValueOnce("sk-test-key")
      .mockResolvedValueOnce(DEFAULT_BASE_URL);
    const notifyMock = vi.fn();

    const result = await auth.login!({
      prompt: promptMock,
      notify: notifyMock,
      signal: new AbortController().signal,
    });

    expect(promptMock).toHaveBeenNthCalledWith(1, {
      type: "secret",
      message: "Enter Requesty API Key (https://app.requesty.ai/api-keys)",
      signal: expect.any(Object),
    });
    expect(promptMock).toHaveBeenNthCalledWith(2, {
      type: "select",
      message: "Select Requesty region / endpoint:",
      options: REQUESTY_ENDPOINTS,
      signal: expect.any(Object),
    });
    expect(result).toEqual({
      type: "api_key",
      key: "sk-test-key",
      env: {
        REQUESTY_BASE_URL: DEFAULT_BASE_URL,
      },
    });
  });

  it("successfully logs in with EU (Frankfurt) endpoint", async () => {
    vi.spyOn(client, "validateApiKey").mockResolvedValue(true);
    vi.spyOn(client, "fetchRequestyModels").mockResolvedValue({
      data: [{ id: "model-1", created: 0, object: "model", owned_by: "requesty" }],
      object: "list",
    });

    const promptMock = vi
      .fn()
      .mockResolvedValueOnce("sk-test-key")
      .mockResolvedValueOnce(DEFAULT_EU_BASE_URL);
    const notifyMock = vi.fn();

    const result = await auth.login!({
      prompt: promptMock,
      notify: notifyMock,
      signal: new AbortController().signal,
    });

    expect(result).toEqual({
      type: "api_key",
      key: "sk-test-key",
      env: {
        REQUESTY_BASE_URL: DEFAULT_EU_BASE_URL,
      },
    });
  });

  it("throws when API key is empty", async () => {
    const promptMock = vi.fn().mockResolvedValueOnce("");
    const notifyMock = vi.fn();

    await expect(
      auth.login!({
        prompt: promptMock,
        notify: notifyMock,
        signal: new AbortController().signal,
      })
    ).rejects.toThrow("API key cannot be empty.");
  });

  it("throws when API key validation fails", async () => {
    vi.spyOn(client, "validateApiKey").mockResolvedValue(false);

    const promptMock = vi
      .fn()
      .mockResolvedValueOnce("sk-invalid-key")
      .mockResolvedValueOnce(DEFAULT_BASE_URL);
    const notifyMock = vi.fn();

    await expect(
      auth.login!({
        prompt: promptMock,
        notify: notifyMock,
        signal: new AbortController().signal,
      })
    ).rejects.toThrow("Invalid API key. Please check your credentials and try again.");
  });
});

describe("createRequestyAuth - resolve", () => {
  const auth = createRequestyAuth();

  it("returns undefined when no credential and no env var", async () => {
    const ctx = {
      env: vi.fn().mockResolvedValue(undefined),
      fileExists: vi.fn().mockResolvedValue(false),
    };

    const result = await auth.resolve!({
      ctx,
      credential: undefined,
      signal: new AbortController().signal,
    });

    expect(result).toBeUndefined();
  });

  it("resolves from stored credential key", async () => {
    const ctx = {
      env: vi.fn().mockResolvedValue(undefined),
      fileExists: vi.fn().mockResolvedValue(false),
    };

    const result = await auth.resolve!({
      ctx,
      credential: { type: "api_key", key: "sk-test-key" },
      signal: new AbortController().signal,
    });

    expect(result).toBeDefined();
    expect(result!.auth.apiKey).toBe("sk-test-key");
    expect(result!.source).toBe("stored credential");
  });

  it("resolves from REQUESTY_API_KEY env var when no credential", async () => {
    const ctx = {
      env: vi.fn(async (name: string) => {
        if (name === "REQUESTY_API_KEY") return "sk-env-key";
        return undefined;
      }),
      fileExists: vi.fn().mockResolvedValue(false),
    };

    const result = await auth.resolve!({
      ctx,
      credential: undefined,
      signal: new AbortController().signal,
    });

    expect(result).toBeDefined();
    expect(result!.auth.apiKey).toBe("sk-env-key");
    expect(result!.source).toBe("REQUESTY_API_KEY");
  });

  it("prefers credential key over env var", async () => {
    const ctx = {
      env: vi.fn(async (name: string) => {
        if (name === "REQUESTY_API_KEY") return "sk-env-key";
        return undefined;
      }),
      fileExists: vi.fn().mockResolvedValue(false),
    };

    const result = await auth.resolve!({
      ctx,
      credential: { type: "api_key", key: "sk-credential-key" },
      signal: new AbortController().signal,
    });

    expect(result!.auth.apiKey).toBe("sk-credential-key");
    expect(result!.source).toBe("stored credential");
  });

  it("resolves base URL from credential env", async () => {
    const ctx = {
      env: vi.fn().mockResolvedValue(undefined),
      fileExists: vi.fn().mockResolvedValue(false),
    };

    const result = await auth.resolve!({
      ctx,
      credential: {
        type: "api_key",
        key: "sk-test-key",
        env: { REQUESTY_BASE_URL: "https://custom.requesty.ai/v1" },
      },
      signal: new AbortController().signal,
    });

    expect(result!.auth.baseUrl).toBe("https://custom.requesty.ai/v1");
  });

  it("resolves base URL from env var when not in credential", async () => {
    const ctx = {
      env: vi.fn(async (name: string) => {
        if (name === "REQUESTY_BASE_URL") return "https://env.requesty.ai/v1";
        return undefined;
      }),
      fileExists: vi.fn().mockResolvedValue(false),
    };

    const result = await auth.resolve!({
      ctx,
      credential: { type: "api_key", key: "sk-test-key" },
      signal: new AbortController().signal,
    });

    expect(result!.auth.baseUrl).toBe("https://env.requesty.ai/v1");
  });

  it("falls back to default base URL", async () => {
    const ctx = {
      env: vi.fn().mockResolvedValue(undefined),
      fileExists: vi.fn().mockResolvedValue(false),
    };

    const result = await auth.resolve!({
      ctx,
      credential: { type: "api_key", key: "sk-test-key" },
      signal: new AbortController().signal,
    });

    expect(result!.auth.baseUrl).toBe(DEFAULT_BASE_URL);
  });

  it("prefers credential env over env var for base URL", async () => {
    const ctx = {
      env: vi.fn(async (name: string) => {
        if (name === "REQUESTY_BASE_URL") return "https://env.requesty.ai/v1";
        return undefined;
      }),
      fileExists: vi.fn().mockResolvedValue(false),
    };

    const result = await auth.resolve!({
      ctx,
      credential: {
        type: "api_key",
        key: "sk-test-key",
        env: { REQUESTY_BASE_URL: "https://credential.requesty.ai/v1" },
      },
      signal: new AbortController().signal,
    });

    expect(result!.auth.baseUrl).toBe("https://credential.requesty.ai/v1");
  });
});

describe("createRequestyAuth - check", () => {
  const auth = createRequestyAuth();

  it("returns AuthCheck for stored credential", async () => {
    const ctx = {
      env: vi.fn().mockResolvedValue(undefined),
      fileExists: vi.fn().mockResolvedValue(false),
    };

    const result = await auth.check!({
      ctx,
      credential: { type: "api_key", key: "sk-test" },
      signal: new AbortController().signal,
    });

    expect(result).toEqual({ type: "api_key", source: "stored credential" });
  });

  it("returns AuthCheck for env var", async () => {
    const ctx = {
      env: vi.fn(async (name: string) => {
        if (name === "REQUESTY_API_KEY") return "sk-env";
        return undefined;
      }),
      fileExists: vi.fn().mockResolvedValue(false),
    };

    const result = await auth.check!({
      ctx,
      credential: undefined,
      signal: new AbortController().signal,
    });

    expect(result).toEqual({ type: "api_key", source: "REQUESTY_API_KEY" });
  });

  it("returns undefined when no auth available", async () => {
    const ctx = {
      env: vi.fn().mockResolvedValue(undefined),
      fileExists: vi.fn().mockResolvedValue(false),
    };

    const result = await auth.check!({
      ctx,
      credential: undefined,
      signal: new AbortController().signal,
    });

    expect(result).toBeUndefined();
  });
});
