import type { Model } from "@earendil-works/pi-ai";

/** Modelo de pi extendido con metadatos específicos de Requesty */
export interface RequestyPiModel extends Model<"openai-completions"> {
  supportsWebSearch?: boolean;
}

/**
 * Pricing tier structure from Requesty API.
 * Defines per-token costs for different usage ranges.
 */
export interface RequestyPricingTier {
  /** Token count above which this tier applies. */
  input_tokens_above: number;
  /** Price per input token. */
  input_price: number;
  /** Price per output token. */
  output_price: number;
  /** Price per cached read token. */
  cached_read_price?: number;
  /** Price per cached write token. */
  caching_price?: number;
}

/**
 * Direct pricing fields (non-tiered).
 */
export interface RequestyDirectPricing {
  /** Price per input token. */
  input_price: number;
  /** Price per output token. */
  output_price: number;
  /** Price per cached read token. */
  cached_read_price?: number;
  /** Price per cached write token. */
  caching_price?: number;
}

/**
 * A single model entry from the Requesty GET /v1/models endpoint.
 */
export interface RequestyModel {
  /** Unique model identifier (e.g., "anthropic/claude-sonnet-4-5"). */
  id: string;
  /** Canonical display name. */
  model_canonical_name?: string;
  /** Human-readable name. */
  name?: string;
  /** Whether the model supports reasoning/thinking. */
  supports_reasoning?: boolean;
  /** Whether the model supports vision (image input). */
  supports_vision?: boolean;
  /** Whether the model supports native web search. */
  supports_web_search?: boolean;
  /** Whether the model supports tool/function calling. */
  supports_tools?: boolean;
  /** Alternative flag for function calling support. */
  supports_function_calling?: boolean;
  /** Maximum context window in tokens. */
  context_window?: number;
  /** Maximum output tokens. */
  max_output_tokens?: number;
  /** Whether the provider supports the `developer` role (vs `system`). */
  supports_role_developer?: boolean;
  /** Pricing as an array of tiers. */
  pricing?: RequestyPricingTier[];
  /** Direct pricing fields (non-tiered). */
  input_price?: number;
  output_price?: number;
  cached_read_price?: number;
  caching_price?: number;
}

/**
 * Response from the Requesty GET /v1/models endpoint.
 */
export interface RequestyModelsResponse {
  /** Array of available models. */
  data: RequestyModel[];
}

/**
 * Provider-scoped environment values resolved for Requesty.
 */
export interface RequestyProviderEnv {
  REQUESTY_BASE_URL?: string;
}
