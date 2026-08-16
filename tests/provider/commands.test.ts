import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleSync, handleStatus } from "../../src/provider/commands.js";
import { getCachedModels, setCachedModels } from "../../src/provider/index.js";
import type { Model } from "@earendil-works/pi-ai";

describe("handleSync", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      ui: {
        notify: vi.fn(),
        setStatus: vi.fn(),
      },
      modelRegistry: {
        getProviderAuth: vi.fn().mockResolvedValue(undefined),
        refresh: vi.fn().mockResolvedValue({
          aborted: false,
          errors: new Map(),
        }),
      },
      signal: undefined,
    };
    vi.clearAllMocks();
  });

  it("completes successfully when authenticated and models are fetched", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue({
      auth: { apiKey: "sk-test", baseUrl: "https://router.requesty.ai/v1" },
      source: "stored credential",
    });

    const testModels = [{ id: "test/model", name: "Test" }] as unknown as Model<"openai-completions">[];
    setCachedModels(testModels);

    await handleSync([], mockCtx);

    expect(mockCtx.ui.setStatus).toHaveBeenCalledWith("requesty-sync", "Syncing models…");
    expect(mockCtx.modelRegistry.refresh).toHaveBeenCalledWith(
      expect.objectContaining({ providers: ["requesty"] })
    );
    expect(mockCtx.ui.notify).toHaveBeenCalledWith(
      "✓ Requesty models synced: 1 models available."
    );
    expect(mockCtx.ui.setStatus).toHaveBeenCalledWith("requesty-sync", undefined);
  });

  it("warns when not authenticated", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue(undefined);

    await handleSync([], mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalledWith(
      "Not authenticated. Run /login requesty first.",
      "warning"
    );
    expect(mockCtx.ui.setStatus).toHaveBeenCalledWith("requesty-sync", undefined);
  });

  it("handles aborted sync", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue({
      auth: { apiKey: "sk-test", baseUrl: "https://router.requesty.ai/v1" },
      source: "stored credential",
    });
    mockCtx.modelRegistry.refresh.mockResolvedValue({ aborted: true, errors: new Map() });

    await handleSync([], mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalledWith("Sync was aborted.", "warning");
  });

  it("handles refresh error", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue({
      auth: { apiKey: "sk-test", baseUrl: "https://router.requesty.ai/v1" },
      source: "stored credential",
    });
    const errorMessage = "Network error";
    mockCtx.modelRegistry.refresh.mockResolvedValue({
      aborted: false,
      errors: new Map([["requesty", new Error(errorMessage)]]),
    });

    await handleSync([], mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalledWith(
      `Sync failed: ${errorMessage}`,
      "error"
    );
  });

  it("warns when no models returned", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue({
      auth: { apiKey: "sk-test", baseUrl: "https://router.requesty.ai/v1" },
      source: "stored credential",
    });
    setCachedModels([]);

    await handleSync([], mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalledWith(
      "No models returned from Requesty.",
      "warning"
    );
  });

  it("handles general errors gracefully", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockRejectedValue(new Error("Unexpected error"));

    await handleSync([], mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalledWith(
      "Sync failed: Unexpected error",
      "error"
    );
  });
});

describe("handleStatus", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      ui: {
        notify: vi.fn(),
      },
      modelRegistry: {
        getProviderAuth: vi.fn().mockResolvedValue(undefined),
      },
      model: undefined,
    };
    vi.clearAllMocks();
  });

  it("shows status when authenticated", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue({
      auth: { apiKey: "sk-test", baseUrl: "https://router.requesty.ai/v1" },
      source: "stored credential",
    });
    setCachedModels([{ id: "test/model" }] as unknown as Model<"openai-completions">[]);

    await handleStatus([], mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalled();
    const message = mockCtx.ui.notify.mock.calls[0][0];
    expect(message).toContain("Requesty Provider Status");
    expect(message).toContain("Authenticated: Yes");
    expect(message).toContain("Source: stored credential");
    expect(message).toContain("Base URL: https://router.requesty.ai/v1");
    expect(message).toContain("Available Models: 1 loaded");
  });

  it("shows status when not authenticated", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue(undefined);
    setCachedModels([]);

    await handleStatus([], mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalled();
    const message = mockCtx.ui.notify.mock.calls[0][0];
    expect(message).toContain("Authenticated: No");
    expect(message).toContain("Available Models: 0 loaded");
  });

  it("shows active model when it matches requesty provider", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue({
      auth: { apiKey: "sk-test", baseUrl: "https://router.requesty.ai/v1" },
      source: "stored credential",
    });
    setCachedModels([]);
    mockCtx.model = { id: "anthropic/claude-sonnet-4-5", provider: "requesty" } as any;

    await handleStatus([], mockCtx);

    const message = mockCtx.ui.notify.mock.calls[0][0];
    expect(message).toContain("Active Model: anthropic/claude-sonnet-4-5");
  });

  it("does not show active model when it does not match requesty provider", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue({
      auth: { apiKey: "sk-test", baseUrl: "https://router.requesty.ai/v1" },
      source: "stored credential",
    });
    setCachedModels([]);
    mockCtx.model = { id: "openai/gpt-4", provider: "openai" } as any;

    await handleStatus([], mockCtx);

    const message = mockCtx.ui.notify.mock.calls[0][0];
    expect(message).not.toContain("Active Model: openai/gpt-4");
  });

  it("does not show active model when no model is selected", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue({
      auth: { apiKey: "sk-test", baseUrl: "https://router.requesty.ai/v1" },
      source: "stored credential",
    });
    setCachedModels([]);
    mockCtx.model = undefined;

    await handleStatus([], mockCtx);

    const message = mockCtx.ui.notify.mock.calls[0][0];
    expect(message).not.toContain("Active Model");
  });
});
