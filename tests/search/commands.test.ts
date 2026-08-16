import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchSubcommands } from "../../src/search/commands.js";
import * as configModule from "../../src/search/config.js";
import type { SubcommandDefinition } from "../../src/types.js";

// Mock dependencies
vi.mock("../../src/search/config.js", () => ({
  getRequestyConfig: vi.fn(),
  setRequestyConfig: vi.fn(),
}));

const mockGetRequestyConfig = configModule.getRequestyConfig as ReturnType<typeof vi.fn>;
const mockSetRequestyConfig = configModule.setRequestyConfig as ReturnType<typeof vi.fn>;

function createMockCtx(model?: any) {
  return {
    ui: {
      notify: vi.fn(),
    },
    model,
  };
}

describe("searchSubcommands", () => {
  it("exports a search subcommand definition", () => {
    expect(searchSubcommands).toHaveLength(1);
    const searchCmd = searchSubcommands.find((s) => s.name === "search");
    expect(searchCmd).toBeDefined();
    expect(searchCmd?.name).toBe("search");
    expect(typeof searchCmd?.handler).toBe("function");
    expect(typeof searchCmd?.getArgumentCompletions).toBe("function");
  });
});

describe("searchCommandHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows help when no args are provided", async () => {
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const ctx = createMockCtx();
    await searchCmd.handler([], ctx);

    expect(ctx.ui.notify).toHaveBeenCalled();
    const message = ctx.ui.notify.mock.calls[0][0];
    expect(message).toContain("Requesty Search Commands");
    expect(message).toContain("/requesty search native on");
    expect(message).toContain("/requesty search native off");
    expect(message).toContain("/requesty search native status");
  });

  it("shows help when 'help' is passed", async () => {
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const ctx = createMockCtx();
    await searchCmd.handler(["help"], ctx);

    expect(ctx.ui.notify).toHaveBeenCalled();
    const message = ctx.ui.notify.mock.calls[0][0];
    expect(message).toContain("Requesty Search Commands");
  });

  it("/requesty search native on sets config to true", async () => {
    mockSetRequestyConfig.mockResolvedValue({ nativeSearch: true });
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const ctx = createMockCtx();
    await searchCmd.handler(["native", "on"], ctx);

    expect(mockSetRequestyConfig).toHaveBeenCalledWith({ nativeSearch: true });
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "Requesty native web search enabled (persisted).",
      "info"
    );
  });

  it("/requesty search native off sets config to false", async () => {
    mockSetRequestyConfig.mockResolvedValue({ nativeSearch: false });
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const ctx = createMockCtx();
    await searchCmd.handler(["native", "off"], ctx);

    expect(mockSetRequestyConfig).toHaveBeenCalledWith({ nativeSearch: false });
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "Requesty native web search disabled (persisted).",
      "info"
    );
  });

  it("/requesty search native status shows current state when enabled", async () => {
    mockGetRequestyConfig.mockResolvedValue({ nativeSearch: true });
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const ctx = createMockCtx({ id: "anthropic/claude-sonnet-4-5", provider: "requesty", supportsWebSearch: true });
    await searchCmd.handler(["native", "status"], ctx);

    expect(ctx.ui.notify).toHaveBeenCalled();
    const message = ctx.ui.notify.mock.calls[0][0];
    expect(message).toContain("Native Search: ON (enabled)");
    expect(message).toContain("Supported ✔");
  });

  it("/requesty search native status shows current state when disabled", async () => {
    mockGetRequestyConfig.mockResolvedValue({ nativeSearch: false });
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const ctx = createMockCtx({ id: "anthropic/claude-sonnet-4-5", provider: "requesty", supportsWebSearch: true });
    await searchCmd.handler(["native", "status"], ctx);

    expect(ctx.ui.notify).toHaveBeenCalled();
    const message = ctx.ui.notify.mock.calls[0][0];
    expect(message).toContain("Native Search: OFF (disabled)");
  });

  it("/requesty search native status shows N/A for non-Requesty model", async () => {
    mockGetRequestyConfig.mockResolvedValue({ nativeSearch: true });
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const ctx = createMockCtx({ id: "openai/gpt-4", provider: "openai" });
    await searchCmd.handler(["native", "status"], ctx);

    expect(ctx.ui.notify).toHaveBeenCalled();
    const message = ctx.ui.notify.mock.calls[0][0];
    expect(message).toContain("N/A (not a Requesty model)");
  });

  it("/requesty search native status shows not supported when model lacks capability", async () => {
    mockGetRequestyConfig.mockResolvedValue({ nativeSearch: true });
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const ctx = createMockCtx({ id: "anthropic/claude-haiku", provider: "requesty", supportsWebSearch: false });
    await searchCmd.handler(["native", "status"], ctx);

    expect(ctx.ui.notify).toHaveBeenCalled();
    const message = ctx.ui.notify.mock.calls[0][0];
    expect(message).toContain("Not supported by this model ✖");
  });

  it("shows warning for unknown subcommand", async () => {
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const ctx = createMockCtx();
    await searchCmd.handler(["unknown"], ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "Unknown search subcommand: 'unknown'. Available: 'native'.",
      "warning"
    );
  });

  it("shows warning for invalid native action", async () => {
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const ctx = createMockCtx();
    await searchCmd.handler(["native", "invalid"], ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "Invalid native search action: 'invalid'. Valid options: on, off, status.",
      "warning"
    );
  });
});

describe("getSearchCompletions", () => {
  it("suggests 'native' at level 1 with no prefix", () => {
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const completions = searchCmd.getArgumentCompletions?.([]) ?? [];

    expect(completions).toHaveLength(1);
    expect(completions[0].value).toBe("native");
    expect(completions[0].description).toContain("Configure Requesty native web search");
  });

  it("filters 'native' by prefix at level 1", () => {
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const completions = searchCmd.getArgumentCompletions?.(["na"]) ?? [];

    expect(completions).toHaveLength(1);
    expect(completions[0].value).toBe("native");
  });

  it("returns empty when prefix does not match at level 1", () => {
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const completions = searchCmd.getArgumentCompletions?.(["xyz"]) ?? [];

    expect(completions).toHaveLength(0);
  });

  it("suggests on/off/status at level 2 after 'native'", () => {
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const completions = searchCmd.getArgumentCompletions?.(["native"]) ?? [];

    expect(completions).toHaveLength(3);
    expect(completions.map((c) => c.value)).toEqual(["on", "off", "status"]);
  });

  it("filters level 2 completions by prefix", () => {
    const searchCmd = searchSubcommands.find((s) => s.name === "search") as SubcommandDefinition;
    const completions = searchCmd.getArgumentCompletions?.(["native", "st"]) ?? [];

    expect(completions).toHaveLength(1);
    expect(completions[0].value).toBe("status");
  });
});
