import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createRequestyProvider, providerSubcommands } from "./provider/index.js";
import {
  searchSubcommands,
  handleNativeSearchBeforeProviderRequest,
} from "./search/index.js";
import { registerSubcommands, createRequestyCommand } from "./commands.js";

/**
 * Default export — the extension factory function.
 * This is called by pi when the extension is loaded.
 */
export default async function requestyExtension(pi: ExtensionAPI): Promise<void> {
  // Create and register the Requesty provider
  const { provider } = createRequestyProvider();
  pi.registerProvider(provider);

  // Register provider subcommands in the command router
  registerSubcommands(providerSubcommands);

  // Register search subcommands (search native on/off)
  registerSubcommands(searchSubcommands);

  // Hook for native web search injection
  pi.on("before_provider_request", async (event, ctx) => {
    return handleNativeSearchBeforeProviderRequest(event, ctx);
  });

  // Register the unified /requesty command
  pi.registerCommand("requesty", createRequestyCommand());
}
