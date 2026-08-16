import type {
  Model,
  Provider,
  RefreshModelsContext,
} from "@earendil-works/pi-ai";
import { stream, streamSimple } from "@earendil-works/pi-ai/compat";
import { fetchRequestyModels } from "./client.js";
import { transformRequestyModels } from "./models.js";
import { createRequestyAuth } from "./auth.js";
import { DEFAULT_BASE_URL, REQUESTY_PROVIDER_ID } from "./constants.js";

/** In-memory model store for the provider. */
let cachedModels: Model<"openai-completions">[] = [];

/**
 * Create the Requesty provider instance as a plain Provider object.
 * Follows the same pattern as the built-in llama.cpp extension.
 */
export function createRequestyProvider(): {
  provider: Provider<"openai-completions">;
} {
  const provider: Provider<"openai-completions"> = {
    id: REQUESTY_PROVIDER_ID,
    name: "Requesty",
    baseUrl: DEFAULT_BASE_URL,
    auth: { apiKey: createRequestyAuth() },
    getModels: () => cachedModels,
    refreshModels: async (context: RefreshModelsContext) => {
      await refreshModelsInternal(context);
    },
    stream: (model, context, options) => {
      return stream(model, context, options as any);
    },
    streamSimple: (model, context, options) => {
      return streamSimple(model, context, options);
    },
  };

  return { provider };
}

/**
 * Internal model refresh logic shared between the provider and commands.
 */
async function refreshModelsInternal(
  context: RefreshModelsContext
): Promise<void> {
  const credential = context.credential as any | undefined;
  const apiKey = credential?.key;

  if (!apiKey) {
    // No credential — try to restore from stored cache
    if (context.stored?.models && context.stored.models.length > 0) {
      cachedModels = context.stored.models.filter(
        (m): m is Model<"openai-completions"> =>
          m.provider === REQUESTY_PROVIDER_ID && m.api === "openai-completions"
      );
      await context.publish({
        update: () => {
          cachedModels = [...cachedModels];
        },
      });
    }
    return;
  }

  // Resolve base URL from credential env or fallback to default
  const baseUrl =
    credential.env?.REQUESTY_BASE_URL ?? DEFAULT_BASE_URL;

  try {
    // Fetch fresh models from Requesty API
    const response = await fetchRequestyModels(
      baseUrl,
      apiKey,
      context.signal
    );

    // Transform to pi models
    const models = transformRequestyModels(response.data, baseUrl);

    // Update in-memory cache
    cachedModels = models;

    // Persist the catalog
    const storeEntry = {
      provider: REQUESTY_PROVIDER_ID,
      models: models as Model<any>[],
      checkedAt: Date.now(),
    };

    await context.publish({
      persist: storeEntry,
      update: () => {
        cachedModels = [...models];
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // On failure, restore from stored cache if available
    if (context.stored?.models && context.stored.models.length > 0) {
      cachedModels = context.stored.models.filter(
        (m): m is Model<"openai-completions"> =>
          m.provider === REQUESTY_PROVIDER_ID && m.api === "openai-completions"
      );
      await context.publish({
        update: () => {
          cachedModels = [...cachedModels];
        },
      });
    } else {
      throw new Error(`Failed to fetch models from Requesty: ${message}`);
    }
  }
}

/**
 * Get the current in-memory model list.
 */
export function getCachedModels(): readonly Model<"openai-completions">[] {
  return cachedModels;
}

/**
 * Set the in-memory model list (used by commands for sync).
 */
export function setCachedModels(
  models: Model<"openai-completions">[]
): void {
  cachedModels = models;
}

// Re-export types
export type { RequestyPiModel } from "./types.js";

// Re-export provider subcommands
export { providerSubcommands } from "./commands.js";
