import type { ExtensionCommandContext, RegisteredCommand } from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem, SubcommandDefinition } from "./types.js";

/** Internal registry of all registered subcommands. */
const registeredSubcommands = new Map<string, SubcommandDefinition>();

/**
 * Register a single subcommand in the router.
 */
export function registerSubcommand(subcommand: SubcommandDefinition): void {
  registeredSubcommands.set(subcommand.name, subcommand);
}

/**
 * Register multiple subcommands at once.
 */
export function registerSubcommands(subcommands: SubcommandDefinition[]): void {
  for (const subcommand of subcommands) {
    registerSubcommand(subcommand);
  }
}

/**
 * Clear all registered subcommands. Useful for tests and clean initializations.
 */
export function clearSubcommands(): void {
  registeredSubcommands.clear();
}

/**
 * Build dynamic help text from all registered subcommands.
 */
function buildHelpText(): string {
  const lines: string[] = [];
  lines.push("Requesty Provider Commands:\n");

  // Group subcommands by category
  const categories = new Map<string, SubcommandDefinition[]>();
  for (const sub of registeredSubcommands.values()) {
    const cat = sub.category || "General";
    if (!categories.has(cat)) {
      categories.set(cat, []);
    }
    categories.get(cat)!.push(sub);
  }

  for (const [category, subs] of categories) {
    lines.push(`  ${category}:`);
    for (const sub of subs) {
      lines.push(`    /requesty ${sub.name}  ${sub.description}`);
    }
    lines.push("");
  }

  lines.push("Authentication:");
  lines.push("  /login requesty        Authenticate with Requesty API key");
  lines.push("  /logout requesty       Remove stored credentials");
  lines.push("");
  lines.push("Model Selection:");
  lines.push("  /model                 Select a model (use fuzzy search to filter)");
  lines.push("  Models appear as requesty/<model-id> in the selector");

  return lines.join("\n");
}

/**
 * Show help using the extension's UI.
 */
function showHelp(ctx: ExtensionCommandContext): void {
  ctx.ui.notify(buildHelpText());
}

/**
 * Create the /requesty root command with hierarchical subcommand routing.
 */
export function createRequestyCommand(): RegisteredCommand {
  return {
    name: "requesty",
    sourceInfo: { type: "extension" } as any,
    description: "Requesty management command",
    getArgumentCompletions: (argumentPrefix: string): AutocompleteItem[] => {
      const prefix = argumentPrefix.toLowerCase();
      const hasTrailingSpace = argumentPrefix.endsWith(" ");
      const trimmed = argumentPrefix.trim();
      const tokens = trimmed ? trimmed.split(/\s+/) : [];

      // Determine if we are completing arguments of a subcommand:
      // - Either there's a trailing space after the subcommand name (e.g. "search ")
      // - Or there are multiple tokens already (e.g. "search nat")
      const isSubcommandArg = (hasTrailingSpace && tokens.length >= 1) || tokens.length > 1;

      if (isSubcommandArg) {
        const subcommandName = tokens[0];
        const subcommand = registeredSubcommands.get(subcommandName);
        if (subcommand && subcommand.getArgumentCompletions) {
          const subArgs = hasTrailingSpace && tokens.length === 1 ? [] : hasTrailingSpace ? [...tokens.slice(1), ""] : tokens.slice(1);
          const rawCompletions = subcommand.getArgumentCompletions(subArgs);

          const basePrefix = hasTrailingSpace
            ? `${tokens.join(" ")} `
            : `${tokens.slice(0, -1).join(" ")} `;

          return rawCompletions.map((item) => ({
            ...item,
            value: item.value.startsWith(basePrefix) ? item.value : `${basePrefix}${item.value}`,
          }));
        }
        return [];
      }

      // Otherwise: filter registered subcommand names by prefix
      return Array.from(registeredSubcommands.values())
        .filter((sub) => sub.name.startsWith(prefix))
        .map((sub) => ({
          value: sub.name,
          label: sub.name,
          description: sub.description,
        }));
    },
    handler: async (args: string, ctx: ExtensionCommandContext): Promise<void> => {
      const trimmed = args.trim();

      // Show help if no args or explicit "help"
      if (!trimmed || trimmed.toLowerCase() === "help") {
        showHelp(ctx);
        return;
      }

      // Split into [subcommandName, ...restArgs]
      const tokens = trimmed.split(/\s+/);
      const subcommandName = tokens[0];
      const restArgs = tokens.slice(1);

      // Look up the subcommand
      const subcommand = registeredSubcommands.get(subcommandName);
      if (!subcommand) {
        ctx.ui.notify(
          `Unknown subcommand: "${subcommandName}". Use /requesty for help.`,
          "error"
        );
        return;
      }

      // Delegate to the subcommand handler
      await subcommand.handler(restArgs, ctx);
    },
  };
}
