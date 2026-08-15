import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequestyCommand, REQUESTY_SUBCOMMANDS } from "../src/commands.js";

describe("createRequestyCommand", () => {
  let command: ReturnType<typeof createRequestyCommand>;

  beforeEach(() => {
    command = createRequestyCommand();
  });

  it("has the correct name", () => {
    expect(command.name).toBe("requesty");
  });

  it("has a description", () => {
    expect(command.description).toContain("Requesty provider management");
  });

  it("exposes subcommand completions", () => {
    const completions = command.getArgumentCompletions!("");
    expect(completions).toHaveLength(2);
    expect(completions.map((c) => c.value)).toEqual(["sync", "status"]);
  });

  it("filters completions by prefix", () => {
    const completions = command.getArgumentCompletions!("s");
    // Both "sync" and "status" start with "s"
    expect(completions).toHaveLength(2);
    expect(completions.map((c) => c.value)).toEqual(["sync", "status"]);
  });

  it("filters completions for sync", () => {
    const completions = command.getArgumentCompletions!("sy");
    expect(completions).toHaveLength(1);
    expect(completions[0].value).toBe("sync");
  });

  it("returns empty array for non-matching prefix", () => {
    const completions = command.getArgumentCompletions!("xyz");
    expect(completions).toHaveLength(0);
  });
});

describe("requesty command handler", () => {
  let command: ReturnType<typeof createRequestyCommand>;
  let mockCtx: any;

  beforeEach(() => {
    command = createRequestyCommand();
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
      model: undefined,
      signal: undefined,
    };
  });

  it("shows help when called without arguments", async () => {
    await command.handler("", mockCtx);
    expect(mockCtx.ui.notify).toHaveBeenCalled();
    const message = mockCtx.ui.notify.mock.calls[0][0];
    expect(message).toContain("Requesty Provider Commands");
    expect(message).toContain("/requesty sync");
    expect(message).toContain("/requesty status");
  });

  it("shows help when called with 'help'", async () => {
    await command.handler("help", mockCtx);
    expect(mockCtx.ui.notify).toHaveBeenCalled();
    const message = mockCtx.ui.notify.mock.calls[0][0];
    expect(message).toContain("/login requesty");
    expect(message).toContain("/logout requesty");
  });

  it("handles 'sync' subcommand", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue({
      auth: { apiKey: "sk-test", baseUrl: "https://router.requesty.ai/v1" },
      source: "stored credential",
    });

    await command.handler("sync", mockCtx);

    expect(mockCtx.ui.setStatus).toHaveBeenCalledWith("requesty-sync", "Syncing models…");
    expect(mockCtx.modelRegistry.refresh).toHaveBeenCalledWith(
      expect.objectContaining({ providers: ["requesty"] })
    );
  });

  it("warns about authentication on sync when not authenticated", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue(undefined);

    await command.handler("sync", mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalledWith(
      "Not authenticated. Run /login requesty first.",
      "warning"
    );
  });

  it("handles 'status' subcommand when authenticated", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue({
      auth: { apiKey: "sk-test", baseUrl: "https://router.requesty.ai/v1" },
      source: "stored credential",
    });

    await command.handler("status", mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalled();
    const message = mockCtx.ui.notify.mock.calls[0][0];
    expect(message).toContain("Requesty Provider Status");
    expect(message).toContain("Authenticated: Yes");
    expect(message).toContain("Source: stored credential");
  });

  it("handles 'status' subcommand when not authenticated", async () => {
    mockCtx.modelRegistry.getProviderAuth.mockResolvedValue(undefined);

    await command.handler("status", mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalled();
    const message = mockCtx.ui.notify.mock.calls[0][0];
    expect(message).toContain("Authenticated: No");
  });

  it("shows error for unknown subcommand", async () => {
    await command.handler("unknown", mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining('Unknown subcommand: "unknown"'),
      "error"
    );
  });
});

describe("REQUESTY_SUBCOMMANDS", () => {
  it("contains exactly sync and status", () => {
    expect(REQUESTY_SUBCOMMANDS).toEqual(["sync", "status"]);
  });
});
