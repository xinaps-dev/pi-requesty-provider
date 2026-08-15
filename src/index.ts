import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createRequestyProvider } from "./provider.js";
import { createRequestyCommand } from "./commands.js";

/**
 * Default export — the extension factory function.
 * This is called by pi when the extension is loaded.
 */
export default async function requestyExtension(pi: ExtensionAPI): Promise<void> {
  // Create and register the Requesty provider
  const { provider } = createRequestyProvider();
  pi.registerProvider(provider);

  // Register the unified /requesty command
  pi.registerCommand("requesty", createRequestyCommand());
}
