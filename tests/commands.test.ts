import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createRequestyCommand,
  registerSubcommand,
  registerSubcommands,
  clearSubcommands,
} from "../src/commands.js";
import type { SubcommandDefinition } from "../src/types.js";

describe("Command Router - Registration", () => {
  beforeEach(() => {
    clearSubcommands();
  });

  it("creates a command with correct name and description", () => {
    const command = createRequestyCommand();
    expect(command.name).toBe("requesty");
    expect(command.description).toBe("Requesty management command");
  });

  it("registers a single subcommand", () => {
    const mockHandler = vi.fn();
    const subcommand: SubcommandDefinition = {
      name: "test",
      description: "Test subcommand",
      handler: mockHandler,
    };
    registerSubcommand(subcommand);

    const command = createRequestyCommand();
    const completions = command.getArgumentCompletions!("");
    expect(completions).toHaveLength(1);
    expect(completions[0].value).toBe("test");
  });

  it("registers multiple subcommands", () => {
    registerSubcommands([
      { name: "alpha", description: "Alpha", handler: vi.fn() },
      { name: "beta", description: "Beta", handler: vi.fn() },
      { name: "gamma", description: "Gamma", handler: vi.fn() },
    ]);

    const command = createRequestyCommand();
    const completions = command.getArgumentCompletions!("");
    expect(completions).toHaveLength(3);
    expect(completions.map((c) => c.value)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("clears all registered subcommands", () => {
    registerSubcommand({ name: "test", description: "Test", handler: vi.fn() });
    clearSubcommands();

    const command = createRequestyCommand();
    const completions = command.getArgumentCompletions!("");
    expect(completions).toHaveLength(0);
  });
});

describe("Command Router - First Level Autocompletion", () => {
  beforeEach(() => {
    clearSubcommands();
  });

  it("returns all subcommands when prefix is empty", () => {
    registerSubcommands([
      { name: "sync", description: "Sync models", handler: vi.fn() },
      { name: "status", description: "Show status", handler: vi.fn() },
    ]);

    const command = createRequestyCommand();
    const completions = command.getArgumentCompletions!("");
    expect(completions).toHaveLength(2);
  });

  it("filters subcommands by prefix", () => {
    registerSubcommands([
      { name: "sync", description: "Sync models", handler: vi.fn() },
      { name: "status", description: "Show status", handler: vi.fn() },
      { name: "deploy", description: "Deploy", handler: vi.fn() },
    ]);

    const command = createRequestyCommand();

    // "s" matches sync and status
    let completions = command.getArgumentCompletions!("s");
    expect(completions).toHaveLength(2);
    expect(completions.map((c) => c.value)).toEqual(["sync", "status"]);

    // "sy" matches only sync
    completions = command.getArgumentCompletions!("sy");
    expect(completions).toHaveLength(1);
    expect(completions[0].value).toBe("sync");

    // "d" matches deploy
    completions = command.getArgumentCompletions!("d");
    expect(completions).toHaveLength(1);
    expect(completions[0].value).toBe("deploy");
  });

  it("returns empty array for non-matching prefix", () => {
    registerSubcommand({ name: "sync", description: "Sync models", handler: vi.fn() });

    const command = createRequestyCommand();
    const completions = command.getArgumentCompletions!("xyz");
    expect(completions).toHaveLength(0);
  });

  it("includes descriptions in completions", () => {
    registerSubcommand({ name: "sync", description: "Sync model catalog", handler: vi.fn() });

    const command = createRequestyCommand();
    const completions = command.getArgumentCompletions!("");
    expect(completions[0].description).toBe("Sync model catalog");
  });
});

describe("Command Router - Delegated Autocompletion", () => {
  beforeEach(() => {
    clearSubcommands();
  });

  it("delegates argument completions to subcommand", () => {
    const subcommandCompletions = [
      { value: "arg1", label: "Arg 1", description: "First arg" },
      { value: "arg2", label: "Arg 2", description: "Second arg" },
    ];

    registerSubcommand({
      name: "search",
      description: "Search models",
      getArgumentCompletions: () => subcommandCompletions,
      handler: vi.fn(),
    });

    const command = createRequestyCommand();
    const completions = command.getArgumentCompletions!("search ");
    expect(completions).toHaveLength(2);
    expect(completions[0].value).toBe("search arg1");
    expect(completions[0].label).toBe("Arg 1");
    expect(completions[1].value).toBe("search arg2");
    expect(completions[1].label).toBe("Arg 2");
  });

  it("delegates argument completions when user is typing sub-arguments without trailing space", () => {
    registerSubcommand({
      name: "search",
      description: "Search models",
      getArgumentCompletions: (args: string[]) => {
        const prefix = args[0] ?? "";
        const options = [
          { value: "native", label: "native" },
          { value: "network", label: "network" },
        ];
        return options.filter((opt) => opt.value.startsWith(prefix));
      },
      handler: vi.fn(),
    });

    const command = createRequestyCommand();
    const completions = command.getArgumentCompletions!("search nat");
    expect(completions).toHaveLength(1);
    expect(completions[0].value).toBe("search native");
    expect(completions[0].label).toBe("native");
  });

  it("returns empty for delegated completions when subcommand has no getArgumentCompletions", () => {
    registerSubcommand({
      name: "simple",
      description: "Simple subcommand",
      handler: vi.fn(),
    });

    const command = createRequestyCommand();
    const completions = command.getArgumentCompletions!("simple ");
    expect(completions).toHaveLength(0);
  });

  it("handles nested arguments in delegated completions", () => {
    registerSubcommand({
      name: "config",
      description: "Configuration",
      getArgumentCompletions: (args: string[]) => {
        if (args[0] === "mode") {
          const prefix = args[1] ?? "";
          const options = [
            { value: "on", label: "On" },
            { value: "off", label: "Off" },
          ];
          return options.filter((opt) => opt.value.startsWith(prefix));
        }
        return [{ value: "mode", label: "Mode" }];
      },
      handler: vi.fn(),
    });

    const command = createRequestyCommand();

    // First level: "config " subcommand
    let completions = command.getArgumentCompletions!("config ");
    expect(completions).toHaveLength(1);
    expect(completions[0].value).toBe("config mode");
    expect(completions[0].label).toBe("Mode");

    // Second level: "config mode " sub-args with space
    completions = command.getArgumentCompletions!("config mode ");
    expect(completions).toHaveLength(2);
    expect(completions.map((c) => c.value)).toEqual(["config mode on", "config mode off"]);

    // Second level: "config mode of" sub-args partial typing
    completions = command.getArgumentCompletions!("config mode of");
    expect(completions).toHaveLength(1);
    expect(completions[0].value).toBe("config mode off");
    expect(completions[0].label).toBe("Off");
  });
});

describe("Command Router - Handler Execution", () => {
  beforeEach(() => {
    clearSubcommands();
  });

  it("executes subcommand handler with correct args", async () => {
    const mockHandler = vi.fn();
    registerSubcommand({
      name: "test",
      description: "Test",
      handler: mockHandler,
    });

    const command = createRequestyCommand();
    const mockCtx = { ui: { notify: vi.fn() } };

    await command.handler!("test arg1 arg2", mockCtx);

    expect(mockHandler).toHaveBeenCalledWith(["arg1", "arg2"], mockCtx);
  });

  it("shows help when called without arguments", () => {
    registerSubcommand({ name: "sync", description: "Sync", handler: vi.fn() });

    const command = createRequestyCommand();
    const mockCtx = { ui: { notify: vi.fn() } };

    command.handler!("", mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalled();
    const message = mockCtx.ui.notify.mock.calls[0][0];
    expect(message).toContain("sync");
  });

  it("shows help when called with 'help'", () => {
    registerSubcommand({ name: "sync", description: "Sync", handler: vi.fn() });

    const command = createRequestyCommand();
    const mockCtx = { ui: { notify: vi.fn() } };

    command.handler!("help", mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalled();
  });

  it("shows error for unknown subcommand", () => {
    registerSubcommand({ name: "sync", description: "Sync", handler: vi.fn() });

    const command = createRequestyCommand();
    const mockCtx = { ui: { notify: vi.fn() } };

    command.handler!("unknown", mockCtx);

    expect(mockCtx.ui.notify).toHaveBeenCalledWith(
      'Unknown subcommand: "unknown". Use /requesty for help.',
      "error"
    );
  });
});

describe("Command Router - Help Generation", () => {
  beforeEach(() => {
    clearSubcommands();
  });

  it("groups subcommands by category", () => {
    registerSubcommands([
      { name: "sync", description: "Sync models", category: "Provider Management", handler: vi.fn() },
      { name: "status", description: "Show status", category: "Provider Management", handler: vi.fn() },
      { name: "debug", description: "Debug info", category: "Advanced", handler: vi.fn() },
    ]);

    const command = createRequestyCommand();
    const mockCtx = { ui: { notify: vi.fn() } };

    command.handler!("help", mockCtx);

    const message = mockCtx.ui.notify.mock.calls[0][0];
    expect(message).toContain("Provider Management");
    expect(message).toContain("Advanced");
  });

  it("includes authentication and model selection sections in help", () => {
    registerSubcommand({ name: "sync", description: "Sync", handler: vi.fn() });

    const command = createRequestyCommand();
    const mockCtx = { ui: { notify: vi.fn() } };

    command.handler!("help", mockCtx);

    const message = mockCtx.ui.notify.mock.calls[0][0];
    expect(message).toContain("/login requesty");
    expect(message).toContain("/logout requesty");
    expect(message).toContain("/model");
  });
});
