import type { ExtensionCommandContext, RegisteredCommand } from "@earendil-works/pi-coding-agent";
import type { Model } from "@earendil-works/pi-ai";
import {
  getCachedModels,
  setCachedModels,
} from "./provider.js";
import { REQUESTY_PROVIDER_ID } from "./constants.js";

/**
 * Available subcommands for the /requesty command.
 */
export const REQUESTY_SUBCOMMANDS = ["sync", "status"] as const;
export type RequestySubcommand = (typeof REQUESTY_SUBCOMMANDS)[number];

/** Minimal AutocompleteItem type (from pi-tui, re-defined for local use). */
interface AutocompleteItem {
  value: string;
  label: string;
  description?: string;
}

/**
 * Create the /requesty command definition.
 */
export function createRequestyCommand(): RegisteredCommand {
  return {
    name: "requesty",
    sourceInfo: { type: "extension" } as any,
    description: "Requesty provider management (sync, status)",
    getArgumentCompletions: (argumentPrefix: string): AutocompleteItem[] => {
      const prefix = argumentPrefix.toLowerCase();
      return REQUESTY_SUBCOMMANDS
        .filter((cmd) => cmd.startsWith(prefix))
        .map((cmd) => ({
          value: cmd,
          label: cmd,
          description:
            cmd === "sync"
              ? "Sync model catalog from Requesty"
              : "Show connection status",
        }));
    },
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const trimmed = args.trim().toLowerCase();

      if (!trimmed || trimmed === "help") {
        showHelp(ctx);
        return;
      }

      switch (trimmed) {
        case "sync":
          await handleSync(ctx);
          break;
        case "status":
          await handleStatus(ctx);
          break;
        default:
          ctx.ui.notify(
            `Unknown subcommand: "${trimmed}". Use /requesty for help.`,
            "error"
          );
      }
    },
  };
}

/**
 * Show usage help for the /requesty command.
 */
function showHelp(ctx: ExtensionCommandContext): void {
  const helpText = `Requesty Provider Commands:

  /requesty              Show this help message
  /requesty sync         Sync model catalog from Requesty API
  /requesty status       Show current connection status

Authentication:
  /login requesty        Authenticate with Requesty API key
  /logout requesty       Remove stored credentials

Model Selection:
  /model                 Select a model (use fuzzy search to filter)
  Models appear as requesty/<model-id> in the selector`;

  ctx.ui.notify(helpText);
}

/**
 * Handle the "sync" subcommand — refresh the model catalog.
 */
async function handleSync(ctx: ExtensionCommandContext): Promise<void> {
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
async function handleStatus(ctx: ExtensionCommandContext): Promise<void> {
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

  ctx.ui.notify(statusLine);
}
