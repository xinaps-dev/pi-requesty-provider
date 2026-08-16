import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem, SubcommandDefinition } from "../types.js";
import { getRequestyConfig, setRequestyConfig } from "./config.js";
import { REQUESTY_PROVIDER_ID } from "../provider/constants.js";
import type { RequestyPiModel } from "../provider/types.js";

/** Handler principal del subcomando /requesty search */
async function searchCommandHandler(
  args: string[],
  ctx: ExtensionCommandContext
): Promise<void> {
  const [topic, action] = args;

  if (!topic || topic === "help") {
    printSearchHelp(ctx);
    return;
  }

  if (topic === "native") {
    await handleNativeSearchAction(action, ctx);
    return;
  }

  ctx.ui.notify(
    `Unknown search subcommand: '${topic}'. Available: 'native'.`,
    "warning"
  );
}

/** Maneja las acciones de /requesty search native [on|off|status] */
async function handleNativeSearchAction(
  action: string | undefined,
  ctx: ExtensionCommandContext
): Promise<void> {
  if (!action || action === "status") {
    const config = await getRequestyConfig();
    const isEnabled = config.nativeSearch === true;
    const currentModel = ctx.model;
    const isRequesty = currentModel?.provider === REQUESTY_PROVIDER_ID;
    const modelSupports = isRequesty && (currentModel as RequestyPiModel)?.supportsWebSearch === true;

    ctx.ui.notify(
      `Requesty Native Search: ${isEnabled ? "ON (enabled)" : "OFF (disabled)"}\n` +
      `Current model (${currentModel?.id ?? "none"}): ${
        !isRequesty
          ? "N/A (not a Requesty model)"
          : modelSupports
          ? "Supported ✔"
          : "Not supported by this model ✖"
      }`,
      "info"
    );
    return;
  }

  if (action === "on") {
    await setRequestyConfig({ nativeSearch: true });
    ctx.ui.notify("Requesty native web search enabled (persisted).", "info");
    return;
  }

  if (action === "off") {
    await setRequestyConfig({ nativeSearch: false });
    ctx.ui.notify("Requesty native web search disabled (persisted).", "info");
    return;
  }

  ctx.ui.notify(
    `Invalid native search action: '${action}'. Valid options: on, off, status.`,
    "warning"
  );
}

function printSearchHelp(ctx: ExtensionCommandContext): void {
  ctx.ui.notify(
    "Requesty Search Commands:\n" +
    "  /requesty search native on      - Enable native web search\n" +
    "  /requesty search native off     - Disable native web search\n" +
    "  /requesty search native status  - View current native search status",
    "info"
  );
}

/** Autocompletado para /requesty search ... */
function getSearchCompletions(args: string[]): AutocompleteItem[] {
  // Nivel 2: /requesty search native <action>
  if (args[0] === "native") {
    if (args.length > 2) {
      return [];
    }
    const prefix = args[1] ?? "";
    const options: AutocompleteItem[] = [
      { value: "on", label: "on", description: "Enable native web search" },
      { value: "off", label: "off", description: "Disable native web search" },
      { value: "status", label: "status", description: "Show native search status" },
    ];
    return options.filter((opt) => opt.value.startsWith(prefix));
  }

  // Nivel 1: /requesty search <subtopic>
  if (args.length <= 1) {
    const prefix = args[0] ?? "";
    const options: AutocompleteItem[] = [
      {
        value: "native",
        label: "native",
        description: "Configure Requesty native web search (on/off/status)",
      },
    ];
    return options.filter((opt) => opt.value.startsWith(prefix));
  }

  return [];
}

/** Definiciones de subcomandos de búsqueda para el Command Router */
export const searchSubcommands: SubcommandDefinition[] = [
  {
    name: "search",
    description: "Manage native web search features (/requesty search native on/off)",
    category: "Search Management",
    handler: searchCommandHandler,
    getArgumentCompletions: getSearchCompletions,
  },
];
