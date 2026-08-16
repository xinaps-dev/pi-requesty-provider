import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleNativeSearchBeforeProviderRequest,
  isGeminiModel,
} from "../../src/search/interceptor.js";
import * as configModule from "../../src/search/config.js";
import * as providerIndex from "../../src/provider/index.js";

// Mock dependencies
vi.mock("../../src/search/config.js", () => ({
  isNativeSearchEnabled: vi.fn(),
}));

vi.mock("../../src/provider/index.js", () => ({
  getCachedModels: vi.fn(),
}));

const mockIsNativeSearchEnabled = configModule.isNativeSearchEnabled as ReturnType<typeof vi.fn>;
const mockGetCachedModels = providerIndex.getCachedModels as ReturnType<typeof vi.fn>;

function createMockCtx(model?: any) {
  return { model };
}

function createEvent(payload: unknown) {
  return { type: "before_provider_request" as const, payload };
}

describe("handleNativeSearchBeforeProviderRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns undefined when payload is null", async () => {
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent(null),
      createMockCtx()
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when payload is not an object", async () => {
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent("string"),
      createMockCtx()
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when payload is an array", async () => {
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent([1, 2, 3]),
      createMockCtx()
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when provider is not Requesty", async () => {
    mockIsNativeSearchEnabled.mockResolvedValue(true);
    const ctx = createMockCtx({ id: "openai/gpt-4", provider: "openai" });
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent({ model: "gpt-4", messages: [] }),
      ctx
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when nativeSearch is disabled", async () => {
    mockIsNativeSearchEnabled.mockResolvedValue(false);
    const ctx = createMockCtx({ id: "anthropic/claude-sonnet-4-5", provider: "requesty" });
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent({ model: "claude", messages: [] }),
      ctx
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when model does not support web search", async () => {
    mockIsNativeSearchEnabled.mockResolvedValue(true);
    const ctx = createMockCtx({
      id: "anthropic/claude-haiku",
      provider: "requesty",
      supportsWebSearch: false,
    });
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent({ model: "claude-haiku", messages: [] }),
      ctx
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when cached model does not support web search", async () => {
    mockIsNativeSearchEnabled.mockResolvedValue(true);
    const ctx = createMockCtx({
      id: "anthropic/claude-haiku",
      provider: "requesty",
      // supportsWebSearch undefined, should fallback to cached
    });
    mockGetCachedModels.mockReturnValue([{
      id: "anthropic/claude-haiku",
      provider: "requesty",
      supportsWebSearch: false,
    }]);
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent({ model: "claude-haiku", messages: [] }),
      ctx
    );
    expect(result).toBeUndefined();
  });

  it("injects web_search tool when all conditions are met", async () => {
    mockIsNativeSearchEnabled.mockResolvedValue(true);
    const ctx = createMockCtx({
      id: "anthropic/claude-sonnet-4-5",
      provider: "requesty",
      supportsWebSearch: true,
    });
    const payload = { model: "claude", messages: [{ role: "user", content: "hello" }] };
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent(payload),
      ctx
    );

    expect(result).toBeDefined();
    expect(result).toEqual({
      model: "claude",
      messages: [{ role: "user", content: "hello" }],
      tools: [{ type: "web_search" }],
    });
  });

  it("does not duplicate web_search tool if already present", async () => {
    mockIsNativeSearchEnabled.mockResolvedValue(true);
    const ctx = createMockCtx({
      id: "anthropic/claude-sonnet-4-5",
      provider: "requesty",
      supportsWebSearch: true,
    });
    const payload = {
      model: "claude",
      messages: [],
      tools: [{ type: "web_search" }],
    };
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent(payload),
      ctx
    );
    expect(result).toBeUndefined();
  });

  it("preserves existing tools and adds web_search", async () => {
    mockIsNativeSearchEnabled.mockResolvedValue(true);
    const ctx = createMockCtx({
      id: "anthropic/claude-sonnet-4-5",
      provider: "requesty",
      supportsWebSearch: true,
    });
    const payload = {
      model: "claude",
      messages: [{ role: "user", content: "search the web" }],
      tools: [
        { type: "read", name: "read_file" },
        { type: "bash", name: "run_command" },
      ],
    };
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent(payload),
      ctx
    );

    expect(result).toBeDefined();
    const r = result as Record<string, unknown>;
    expect(r.model).toBe("claude");
    expect(r.messages).toEqual([{ role: "user", content: "search the web" }]);
    expect(Array.isArray(r.tools)).toBe(true);
    const tools = r.tools as Array<{ type: string }>;
    expect(tools).toHaveLength(3);
    expect(tools[0].type).toBe("read");
    expect(tools[1].type).toBe("bash");
    expect(tools[2].type).toBe("web_search");
  });

  it("adds web_search when tools is undefined", async () => {
    mockIsNativeSearchEnabled.mockResolvedValue(true);
    const ctx = createMockCtx({
      id: "anthropic/claude-sonnet-4-5",
      provider: "requesty",
      supportsWebSearch: true,
    });
    const payload = { model: "claude", messages: [] };
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent(payload),
      ctx
    );

    expect(result).toBeDefined();
    const r = result as Record<string, unknown>;
    expect(r.tools).toEqual([{ type: "web_search" }]);
  });

  it("looks up supportsWebSearch in cached models when not on ctx.model", async () => {
    mockIsNativeSearchEnabled.mockResolvedValue(true);
    const ctx = createMockCtx({
      id: "anthropic/claude-sonnet-4-5",
      provider: "requesty",
      // supportsWebSearch is undefined on the model
    });
    mockGetCachedModels.mockReturnValue([{
      id: "anthropic/claude-sonnet-4-5",
      provider: "requesty",
      supportsWebSearch: true,
    }]);
    const payload = { model: "claude", messages: [] };
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent(payload),
      ctx
    );

    expect(result).toBeDefined();
    const r = result as Record<string, unknown>;
    expect(Array.isArray(r.tools)).toBe(true);
    expect((r.tools as Array<{ type: string }>).some((t) => t.type === "web_search")).toBe(true);
  });

  it("does not inject web_search for google/gemini models even with supportsWebSearch: true", async () => {
    mockIsNativeSearchEnabled.mockResolvedValue(true);
    const ctx = createMockCtx({
      id: "google/gemini-2.5-flash-lite:flex",
      provider: "requesty",
      supportsWebSearch: true,
    });
    const payload = {
      model: "gemini",
      messages: [],
      tools: [{ type: "function", function: { name: "read" } }],
    };
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent(payload),
      ctx
    );
    expect(result).toBeUndefined();
  });

  it("does not inject web_search for vertex/gemini models even with supportsWebSearch: true", async () => {
    mockIsNativeSearchEnabled.mockResolvedValue(true);
    const ctx = createMockCtx({
      id: "vertex/gemini-2.5-flash-lite",
      provider: "requesty",
      supportsWebSearch: true,
    });
    const payload = {
      model: "gemini",
      messages: [],
      tools: [{ type: "function", function: { name: "read" } }],
    };
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent(payload),
      ctx
    );
    expect(result).toBeUndefined();
  });

  it("injects web_search for vertex/claude models", async () => {
    mockIsNativeSearchEnabled.mockResolvedValue(true);
    const ctx = createMockCtx({
      id: "vertex/claude-haiku-4-5",
      provider: "requesty",
      supportsWebSearch: true,
    });
    const payload = {
      model: "claude",
      messages: [],
      tools: [{ type: "function", function: { name: "read" } }],
    };
    const result = await handleNativeSearchBeforeProviderRequest(
      createEvent(payload),
      ctx
    );
    expect(result).toBeDefined();
    const r = result as Record<string, unknown>;
    const tools = r.tools as Array<{ type: string }>;
    expect(tools).toHaveLength(2);
    expect(tools.some((t) => t.type === "web_search")).toBe(true);
  });
});

describe("isGeminiModel", () => {
  it("identifies google/gemini models", () => {
    expect(isGeminiModel("google/gemini-2.5-flash-lite:flex")).toBe(true);
    expect(isGeminiModel("google/gemini-pro")).toBe(true);
  });

  it("identifies vertex/gemini models", () => {
    expect(isGeminiModel("vertex/gemini-2.5-flash-lite")).toBe(true);
    expect(isGeminiModel("vertex/gemini-1.5-pro")).toBe(true);
  });

  it("returns false for non-Gemini vertex models", () => {
    expect(isGeminiModel("vertex/claude-haiku-4-5")).toBe(false);
    expect(isGeminiModel("vertex/llama-3")).toBe(false);
  });

  it("returns false for other providers", () => {
    expect(isGeminiModel("openai-responses/gpt-5-nano")).toBe(false);
    expect(isGeminiModel("xai/grok-4-fast")).toBe(false);
    expect(isGeminiModel("anthropic/claude-haiku-4-5")).toBe(false);
  });
});
