import { describe, it, expect } from "vitest";
import {
  transformRequestyModelToPiModel,
  transformRequestyModels,
} from "../../src/provider/models.js";
import { DEFAULT_BASE_URL } from "../../src/provider/constants.js";
import type { RequestyModel } from "../../src/provider/types.js";

const BASE_URL = DEFAULT_BASE_URL;

/** Helper to create a minimal RequestyModel for testing. */
function createRequestyModel(overrides: Partial<RequestyModel> = {}): RequestyModel {
  return {
    id: "test/model",
    name: "Test Model",
    supports_reasoning: false,
    supports_vision: false,
    context_window: 128_000,
    max_output_tokens: 4_096,
    supports_role_developer: true,
    input_price: 0.000003,
    output_price: 0.000015,
    ...overrides,
  };
}

describe("transformRequestyModelToPiModel", () => {
  it("maps basic model properties correctly", () => {
    const model = createRequestyModel();
    const result = transformRequestyModelToPiModel(model, BASE_URL);

    expect(result.id).toBe("test/model");
    expect(result.name).toBe("Test Model");
    expect(result.provider).toBe("requesty");
    expect(result.api).toBe("openai-completions");
    expect(result.baseUrl).toBe(BASE_URL);
    expect(result.reasoning).toBe(false);
    expect(result.input).toEqual(["text"]);
    expect(result.contextWindow).toBe(128_000);
    expect(result.maxTokens).toBe(4_096);
  });

  it("uses model_canonical_name when name is missing", () => {
    const model = createRequestyModel({
      name: undefined,
      model_canonical_name: "Claude Sonnet 4",
    });
    const result = transformRequestyModelToPiModel(model, BASE_URL);
    expect(result.name).toBe("Claude Sonnet 4");
  });

  it("falls back to id when both name and canonical are missing", () => {
    const model = createRequestyModel({
      name: undefined,
      model_canonical_name: undefined,
    });
    const result = transformRequestyModelToPiModel(model, BASE_URL);
    expect(result.name).toBe("test/model");
  });

  it("detects reasoning support", () => {
    const model = createRequestyModel({ supports_reasoning: true });
    const result = transformRequestyModelToPiModel(model, BASE_URL);
    expect(result.reasoning).toBe(true);
  });

  it("detects vision support", () => {
    const model = createRequestyModel({ supports_vision: true });
    const result = transformRequestyModelToPiModel(model, BASE_URL);
    expect(result.input).toEqual(["text", "image"]);
  });

  it("sets compat.supportsReasoningEffort for reasoning models", () => {
    const model = createRequestyModel({ supports_reasoning: true });
    const result = transformRequestyModelToPiModel(model, BASE_URL);
    expect(result.compat?.supportsReasoningEffort).toBe(true);
  });

  it("sets compat.supportsDeveloperRole to false when specified", () => {
    const model = createRequestyModel({ supports_role_developer: false });
    const result = transformRequestyModelToPiModel(model, BASE_URL);
    expect(result.compat?.supportsDeveloperRole).toBe(false);
  });

  it("calculates direct pricing correctly (per million tokens)", () => {
    const model = createRequestyModel({
      input_price: 0.000003,
      output_price: 0.000015,
      cached_read_price: 0.0000015,
      caching_price: 0.00000375,
    });
    const result = transformRequestyModelToPiModel(model, BASE_URL);

    expect(result.cost.input).toBe(3);           // 0.000003 * 1_000_000
    expect(result.cost.output).toBe(15);          // 0.000015 * 1_000_000
    expect(result.cost.cacheRead).toBe(1.5);      // 0.0000015 * 1_000_000
    expect(result.cost.cacheWrite).toBe(3.75);    // 0.00000375 * 1_000_000
  });

  it("handles tiered pricing", () => {
    const model = createRequestyModel({
      pricing: [
        {
          input_tokens_above: 0,
          input_price: 0.000003,
          output_price: 0.000015,
          cached_read_price: 0.0000015,
          caching_price: 0.00000375,
        },
        {
          input_tokens_above: 128_000,
          input_price: 0.000015,
          output_price: 0.00006,
        },
      ],
    });
    const result = transformRequestyModelToPiModel(model, BASE_URL);

    // Base rates from first tier
    expect(result.cost.input).toBe(3);
    expect(result.cost.output).toBe(15);
    expect(result.cost.cacheRead).toBe(1.5);
    expect(result.cost.cacheWrite).toBe(3.75);

    // Tiers are preserved
    expect(result.cost.tiers).toHaveLength(2);
    expect(result.cost.tiers?.[0].inputTokensAbove).toBe(0);
    expect(result.cost.tiers?.[1].inputTokensAbove).toBe(128_000);
  });

  it("uses fallback context window and max tokens when not specified", () => {
    const model = createRequestyModel({
      context_window: undefined,
      max_output_tokens: undefined,
    });
    const result = transformRequestyModelToPiModel(model, BASE_URL);
    expect(result.contextWindow).toBe(128_000);
    expect(result.maxTokens).toBe(4_096);
  });

  it("maps custom context window and max tokens", () => {
    const model = createRequestyModel({
      context_window: 200_000,
      max_output_tokens: 8_192,
    });
    const result = transformRequestyModelToPiModel(model, BASE_URL);
    expect(result.contextWindow).toBe(200_000);
    expect(result.maxTokens).toBe(8_192);
  });

  it("maps supports_web_search: true to supportsWebSearch: true", () => {
    const model = createRequestyModel({ supports_web_search: true });
    const result = transformRequestyModelToPiModel(model, BASE_URL);
    expect(result.supportsWebSearch).toBe(true);
  });

  it("maps supports_web_search: false to supportsWebSearch: false", () => {
    const model = createRequestyModel({ supports_web_search: false });
    const result = transformRequestyModelToPiModel(model, BASE_URL);
    expect(result.supportsWebSearch).toBe(false);
  });

  it("maps supports_web_search: undefined to supportsWebSearch: false", () => {
    const model = createRequestyModel({ supports_web_search: undefined });
    const result = transformRequestyModelToPiModel(model, BASE_URL);
    expect(result.supportsWebSearch).toBe(false);
  });
});

describe("transformRequestyModels - filtering", () => {
  it("filters out models where supports_tools is false", () => {
    const models: RequestyModel[] = [
      createRequestyModel({ id: "openai/gpt-4o", supports_tools: true }),
      createRequestyModel({ id: "some/no-tools", supports_tools: false }),
    ];
    const result = transformRequestyModels(models, BASE_URL);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("openai/gpt-4o");
  });

  it("filters out models where supports_function_calling is false", () => {
    const models: RequestyModel[] = [
      createRequestyModel({ id: "anthropic/claude-3-7-sonnet", supports_function_calling: true }),
      createRequestyModel({ id: "custom/no-functions", supports_function_calling: false }),
    ];
    const result = transformRequestyModels(models, BASE_URL);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("anthropic/claude-3-7-sonnet");
  });

  it("filters out perplexity models", () => {
    const models: RequestyModel[] = [
      createRequestyModel({ id: "perplexity/sonar" }),
      createRequestyModel({ id: "perplexity/sonar-reasoning" }),
      createRequestyModel({ id: "openai-responses/gpt-5-nano" }),
      createRequestyModel({ id: "google/gemini-2.5-flash-lite:flex" }),
    ];
    const result = transformRequestyModels(models, BASE_URL);
    expect(result.map((m) => m.id)).toEqual([
      "openai-responses/gpt-5-nano",
      "google/gemini-2.5-flash-lite:flex",
    ]);
  });
});
