import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRequestyConfig, setRequestyConfig, isNativeSearchEnabled, getRequestyConfigPath } from "../../src/search/config.js";
import * as fsPromises from "node:fs/promises";
import * as pathModule from "node:path";

// Mock getAgentDir
vi.mock("@earendil-works/pi-coding-agent", () => ({
  getAgentDir: vi.fn(() => "/mock/.pi/agent"),
}));

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

// Mock node:path
vi.mock("node:path", () => ({
  join: vi.fn((...parts: string[]) => parts.join("/")),
  dirname: vi.fn((p: string) => p.split("/").slice(0, -1).join("/")),
}));

const mockJoin = pathModule.join as unknown as ReturnType<typeof vi.fn>;
const mockDirname = pathModule.dirname as unknown as ReturnType<typeof vi.fn>;
const mockReadFile = fsPromises.readFile as unknown as ReturnType<typeof vi.fn>;
const mockWriteFile = fsPromises.writeFile as unknown as ReturnType<typeof vi.fn>;
const mockMkdir = fsPromises.mkdir as unknown as ReturnType<typeof vi.fn>;

describe("getRequestyConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default join returns the expected path
    mockJoin.mockImplementation((...parts) => parts.join("/"));
    mockDirname.mockImplementation((p) => p.split("/").slice(0, -1).join("/"));
  });

  it("returns default config when file does not exist", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file"));

    const config = await getRequestyConfig();

    expect(config).toEqual({ nativeSearch: false });
  });

  it("returns default config when file contains invalid JSON", async () => {
    mockReadFile.mockResolvedValue("{invalid json}");

    const config = await getRequestyConfig();

    expect(config).toEqual({ nativeSearch: false });
  });

  it("reads nativeSearch: true from file", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ nativeSearch: true }));

    const config = await getRequestyConfig();

    expect(config).toEqual({ nativeSearch: true });
  });

  it("reads nativeSearch: false from file", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ nativeSearch: false }));

    const config = await getRequestyConfig();

    expect(config).toEqual({ nativeSearch: false });
  });

  it("falls back to default when nativeSearch is not a boolean", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ nativeSearch: "yes" }));

    const config = await getRequestyConfig();

    expect(config).toEqual({ nativeSearch: false });
  });
});

describe("setRequestyConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoin.mockImplementation((...parts) => parts.join("/"));
    mockDirname.mockImplementation((p) => p.split("/").slice(0, -1).join("/"));
  });

  it("creates new config with nativeSearch: true", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    mockWriteFile.mockResolvedValue(undefined);

    const result = await setRequestyConfig({ nativeSearch: true });

    expect(result).toEqual({ nativeSearch: true });
    expect(mockWriteFile).toHaveBeenCalledWith(
      "/mock/.pi/agent/pi-requesty.json",
      expect.stringContaining('"nativeSearch": true'),
      "utf8"
    );
  });

  it("creates new config with nativeSearch: false", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    mockWriteFile.mockResolvedValue(undefined);

    const result = await setRequestyConfig({ nativeSearch: false });

    expect(result).toEqual({ nativeSearch: false });
    expect(mockWriteFile).toHaveBeenCalledWith(
      "/mock/.pi/agent/pi-requesty.json",
      expect.stringContaining('"nativeSearch": false'),
      "utf8"
    );
  });

  it("updates existing config preserving other fields", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ nativeSearch: true, otherField: "value" }));
    mockWriteFile.mockResolvedValue(undefined);

    const result = await setRequestyConfig({ nativeSearch: false });

    // The config interface only has nativeSearch, so otherField is not returned
    expect(result).toEqual({ nativeSearch: false });
  });

  it("calls mkdir with recursive before writing", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    mockWriteFile.mockResolvedValue(undefined);

    await setRequestyConfig({ nativeSearch: true });

    expect(mockMkdir).toHaveBeenCalledWith("/mock/.pi/agent", { recursive: true });
  });
});

describe("isNativeSearchEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoin.mockImplementation((...parts) => parts.join("/"));
  });

  it("returns true when nativeSearch is true", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ nativeSearch: true }));

    const result = await isNativeSearchEnabled();

    expect(result).toBe(true);
  });

  it("returns false when nativeSearch is false", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ nativeSearch: false }));

    const result = await isNativeSearchEnabled();

    expect(result).toBe(false);
  });

  it("returns false when file does not exist", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    const result = await isNativeSearchEnabled();

    expect(result).toBe(false);
  });
});

describe("getRequestyConfigPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoin.mockImplementation((...parts) => parts.join("/"));
  });

  it("returns the correct path using getAgentDir", () => {
    const path = getRequestyConfigPath();
    expect(mockJoin).toHaveBeenCalledWith("/mock/.pi/agent", "pi-requesty.json");
    expect(path).toBe("/mock/.pi/agent/pi-requesty.json");
  });
});
