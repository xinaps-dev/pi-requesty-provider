import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { SubcommandDefinition } from "../types.js";
import { REQUESTY_PROVIDER_ID } from "./constants.js";
import { getCachedModels } from "./index.js";
import { isNativeSearchEnabled } from "../search/index.js";
import type { RequestyPiModel } from "./types.js";

/**
 * Handle the "sync" subcommand — refresh the model catalog.
 */
export async function handleSync(
  args: string[],
  ctx: ExtensionCommandContext
): Promise<void> {
  ctx.ui.setStatus("requesty-sync", "Syncing models…");

  try {
    // Get auth from modelRegistry
    const authResult = await ctx.modelRegistry.getProviderAuth(
      REQUESTY_PROVIDER_ID
    );

    if (!authResult) {
      ctx.ui.notify(
        "Not authenticated. Run /login requesty first.",
        "warning"
      );
      ctx.ui.setStatus("requesty-sync", undefined);
      return;
    }

    // Use modelRegistry refresh which handles the provider's refreshModels
    const result = await ctx.modelRegistry.refresh({
      providers: [REQUESTY_PROVIDER_ID],
      signal: ctx.signal || new AbortController().signal,
    });

    if (result.aborted) {
      ctx.ui.notify("Sync was aborted.", "warning");
      return;
    }

    const refreshError = result.errors.get(REQUESTY_PROVIDER_ID);
    if (refreshError) {
      ctx.ui.notify(`Sync failed: ${refreshError.message}`, "error");
      return;
    }

    const models = getCachedModels();

    if (models.length > 0) {
      ctx.ui.notify(
        `✓ Requesty models synced: ${models.length} models available.`
      );
    } else {
      ctx.ui.notify("No models returned from Requesty.", "warning");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.ui.notify(`Sync failed: ${message}`, "error");
  } finally {
    ctx.ui.setStatus("requesty-sync", undefined);
  }
}

/**
 * Handle the "status" subcommand — show current connection info.
 */
export async function handleStatus(
  args: string[],
  ctx: ExtensionCommandContext
): Promise<void> {
  const authResult = await ctx.modelRegistry.getProviderAuth(
    REQUESTY_PROVIDER_ID
  );

  const models = getCachedModels();

  let statusLine = "Requesty Provider Status:\n";
  statusLine += `  - Authenticated: ${authResult ? "Yes" : "No"}\n`;

  if (authResult) {
    statusLine += `  - Source: ${authResult.source}\n`;
    statusLine += `  - Base URL: ${authResult.auth.baseUrl}\n`;
  }

  statusLine += `  - Available Models: ${models.length} loaded\n`;

  // Try to get the currently active model
  const currentModel = ctx.model;
  if (currentModel && currentModel.provider === REQUESTY_PROVIDER_ID) {
    statusLine += `  - Active Model: ${currentModel.id}\n`;
  }

  // Native search status
  const nativeSearchOn = await isNativeSearchEnabled();
  const isRequestyModel = currentModel?.provider === REQUESTY_PROVIDER_ID;
  const supportsSearch = isRequestyModel && (currentModel as RequestyPiModel)?.supportsWebSearch === true;

  statusLine += `  - Native Search: ${nativeSearchOn ? "Enabled" : "Disabled"}\n`;
  if (isRequestyModel) {
    statusLine += `  - Active Model Search Support: ${supportsSearch ? "Supported ✔" : "Not supported ✖"}\n`;
  } else if (currentModel) {
    statusLine += `  - Active Model Search Support: N/A (not a Requesty model)\n`;
  }

  ctx.ui.notify(statusLine);
}

/**
 * Provider subcommands definition array.
 */
export const providerSubcommands: SubcommandDefinition[] = [
  {
    name: "sync",
    description: "Sync model catalog from Requesty",
    category: "Provider Management",
    handler: handleSync,
  },
  {
    name: "status",
    description: "Show connection status",
    category: "Provider Management",
    handler: handleStatus,
  },
];
