import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequestyAuth } from "../src/auth.js";
import { DEFAULT_BASE_URL } from "../src/constants.js";

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
