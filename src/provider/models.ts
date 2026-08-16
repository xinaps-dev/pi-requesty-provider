import type { Model } from "@earendil-works/pi-ai";
import type { RequestyModel, RequestyPiModel, RequestyPricingTier } from "./types.js";
import {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_TOKENS,
  REQUESTY_PROVIDER_ID,
} from "./constants.js";

/**
 * Transform a single Requesty model into a pi Model.
 * @param model - The raw model from Requesty API.
 * @param baseUrl - The base URL to use for the model's baseUrl field.
 * @returns A pi-compatible Model definition.
 */
export function transformRequestyModelToPiModel(
  model: RequestyModel,
  baseUrl: string
): RequestyPiModel {
  const name = model.name ?? model.model_canonical_name ?? model.id;

  // Determine reasoning support
  const reasoning = model.supports_reasoning === true;

  // Determine input modalities
  const input: ("text" | "image")[] = model.supports_vision
    ? ["text", "image"]
    : ["text"];

  // Calculate pricing per million tokens
  const cost = calculatePricing(model);

  // Context window and max tokens with fallbacks
  const contextWindow = model.context_window ?? DEFAULT_CONTEXT_WINDOW;
  const maxTokens = model.max_output_tokens ?? DEFAULT_MAX_TOKENS;

  // Compatibility settings
  const compat: Model<"openai-completions">["compat"] = {
    supportsDeveloperRole:
      model.supports_role_developer === false ? false : undefined,
    supportsReasoningEffort: reasoning,
  };

  // Web search support
  const supportsWebSearch = model.supports_web_search === true;

  return {
    id: model.id,
    name,
    provider: REQUESTY_PROVIDER_ID,
    api: "openai-completions",
    baseUrl,
    reasoning,
    input,
    cost,
    contextWindow,
    maxTokens,
    compat,
    supportsWebSearch,
  };
}

/**
 * Calculate the cost object from a Requesty model's pricing data.
 * Supports both direct pricing fields and tiered pricing arrays.
 */
function calculatePricing(model: RequestyModel): Model<"openai-completions">["cost"] {
  // Check for tiered pricing first
  if (model.pricing && Array.isArray(model.pricing) && model.pricing.length > 0) {
    const tiers: Model<"openai-completions">["cost"]["tiers"] = [];

    for (const tier of model.pricing) {
      tiers.push({
        input: tier.input_price * 1_000_000,
        output: tier.output_price * 1_000_000,
        cacheRead: tier.cached_read_price
          ? tier.cached_read_price * 1_000_000
          : 0,
        cacheWrite: tier.caching_price
          ? tier.caching_price * 1_000_000
          : 0,
        inputTokensAbove: tier.input_tokens_above,
      });
    }

    // Base rates from the first tier (lowest threshold) or direct fields
    const baseTier = model.pricing[0];
    return {
      input: baseTier.input_price * 1_000_000,
      output: baseTier.output_price * 1_000_000,
      cacheRead: baseTier.cached_read_price
        ? baseTier.cached_read_price * 1_000_000
        : 0,
      cacheWrite: baseTier.caching_price
        ? baseTier.caching_price * 1_000_000
        : 0,
      tiers,
    };
  }

  // Direct pricing (non-tiered)
  const inputPrice = model.input_price ?? 0;
  const outputPrice = model.output_price ?? 0;

  return {
    input: inputPrice * 1_000_000,
    output: outputPrice * 1_000_000,
    cacheRead: model.cached_read_price
      ? model.cached_read_price * 1_000_000
      : 0,
    cacheWrite: model.caching_price
      ? model.caching_price * 1_000_000
      : 0,
  };
}

/**
 * Transform an array of Requesty models into pi Models, filtering out
 * models that do not support tool/function calling.
 * @param models - Raw models from the Requesty API.
 * @param baseUrl - The base URL for all models.
 * @returns Array of pi-compatible Model definitions.
 */
export function transformRequestyModels(
  models: RequestyModel[],
  baseUrl: string
): RequestyPiModel[] {
  return models
    .filter((model) => {
      // 1. Filter out models that explicitly declare lack of tool/function calling support
      if (model.supports_tools === false || model.supports_function_calling === false) {
        return false;
      }
      // 2. Safety filter for known providers lacking tool calling support
      if (model.id.startsWith("perplexity/")) {
        return false;
      }
      return true;
    })
    .map((model) => transformRequestyModelToPiModel(model, baseUrl));
}
