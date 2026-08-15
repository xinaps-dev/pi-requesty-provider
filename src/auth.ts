import type {
  ApiKeyAuth,
  AuthContext,
  AuthInteraction,
  AuthResult,
  ProviderAuthInteraction,
} from "@earendil-works/pi-ai";
import { validateApiKey, fetchRequestyModels } from "./client.js";
import {
  DEFAULT_BASE_URL,
  DEFAULT_EU_BASE_URL,
  REQUESTY_PROVIDER_ID,
} from "./constants.js";

/**
 * Create the Requesty ApiKeyAuth implementation.
 * Handles login (with validation), resolve, and check flows.
 */
export function createRequestyAuth(): ApiKeyAuth {
  return {
    name: "Requesty API Key",

    login: async (interaction: ProviderAuthInteraction) => {
      // Prompt for the API key
      const apiKey = await interaction.prompt({
        type: "secret",
        message:
          "Enter Requesty API Key (https://app.requesty.ai/api-keys)",
        signal: interaction.signal,
      });

      if (!apiKey || apiKey.trim().length === 0) {
        throw new Error("API key cannot be empty.");
      }

      // Prompt for base URL (optional override)
      let baseUrl = DEFAULT_BASE_URL;
      try {
        const urlChoice = await interaction.prompt({
          type: "text",
          message:
            "Base URL (leave empty for default US: https://router.requesty.ai/v1, or enter EU: https://router.eu.requesty.ai/v1)",
          placeholder: DEFAULT_BASE_URL,
          signal: interaction.signal,
        });

        if (urlChoice && urlChoice.trim().length > 0) {
          const trimmed = urlChoice.trim();
          // Auto-select EU endpoint if user enters "eu" or similar
          if (trimmed.toLowerCase() === "eu" || trimmed.startsWith("https://router.eu")) {
            baseUrl = DEFAULT_EU_BASE_URL;
          } else {
            baseUrl = trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
          }
        }
      } catch {
        // User cancelled URL prompt, keep default
      }

      // Validate the API key against Requesty
      interaction.notify({
        type: "progress",
        message: "Validating API key...",
      });

      const isValid = await validateApiKey(
        apiKey.trim(),
        baseUrl,
        interaction.signal
      );

      if (!isValid) {
        throw new Error(
          "Invalid API key. Please check your credentials and try again."
        );
      }

      // Validate by fetching models to confirm access
      interaction.notify({
        type: "progress",
        message: "Fetching approved models...",
      });

      try {
        await fetchRequestyModels(baseUrl, apiKey.trim(), interaction.signal);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to validate models: ${message}`);
      }

      interaction.notify({
        type: "info",
        message: "Authentication successful!",
      });

      return {
        type: "api_key",
        key: apiKey.trim(),
        env: {
          REQUESTY_BASE_URL: baseUrl,
        },
      };
    },

    resolve: async ({
      ctx,
      credential,
      signal,
    }): Promise<AuthResult | undefined> => {
      // Priority 1: Stored credential key
      let apiKey: string | undefined = credential?.key;
      let source = credential?.key ? "stored credential" : undefined;

      // Priority 2: Environment variable fallback
      if (!apiKey) {
        apiKey = await ctx.env("REQUESTY_API_KEY");
        source = apiKey ? "REQUESTY_API_KEY" : undefined;
      }

      if (!apiKey) {
        return undefined;
      }

      // Resolve base URL: credential env > env var > default
      let baseUrl: string | undefined =
        credential?.env?.REQUESTY_BASE_URL;

      if (!baseUrl) {
        baseUrl = await ctx.env("REQUESTY_BASE_URL");
      }

      if (!baseUrl) {
        baseUrl = DEFAULT_BASE_URL;
      }

      return {
        auth: {
          apiKey,
          baseUrl,
        },
        env: {
          REQUESTY_BASE_URL: baseUrl,
        },
        source,
      };
    },

    check: async ({ ctx, credential }): Promise<AuthCheck | undefined> => {
      // Check for stored credential
      if (credential?.key) {
        return {
          type: "api_key",
          source: "stored credential",
        };
      }

      // Check for environment variable
      const envKey = await ctx.env("REQUESTY_API_KEY");
      if (envKey) {
        return {
          type: "api_key",
          source: "REQUESTY_API_KEY",
        };
      }

      return undefined;
    },
  };
}

/**
 * AuthCheck type alias for the check method result.
 */
interface AuthCheck {
  source?: string;
  type: "api_key" | "oauth";
}
