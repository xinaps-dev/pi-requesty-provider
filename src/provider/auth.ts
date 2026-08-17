import type {
  ApiKeyAuth,
  AuthContext,
  AuthResult,
  ProviderAuthInteraction,
} from "@earendil-works/pi-ai";
import { validateApiKey, fetchRequestyModels } from "./client.js";
import {
  DEFAULT_BASE_URL,
  DEFAULT_EU_BASE_URL,
  REQUESTY_ENDPOINTS,
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

      // Prompt for regional endpoint selection
      let baseUrl = DEFAULT_BASE_URL;
      try {
        const selectedEndpoint = await interaction.prompt({
          type: "select",
          message: "Select Requesty region / endpoint:",
          options: REQUESTY_ENDPOINTS,
          signal: interaction.signal,
        });

        if (selectedEndpoint && selectedEndpoint.trim().length > 0) {
          baseUrl = selectedEndpoint.trim();
        }
      } catch {
        // User cancelled selection prompt, keep default
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
