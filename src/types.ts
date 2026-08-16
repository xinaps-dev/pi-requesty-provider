import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

/** Elemento para autocompletado en el TUI. */
export interface AutocompleteItem {
  value: string;
  label: string;
  description?: string;
}

/** Definición base de un subcomando o grupo de subcomandos. */
export interface SubcommandDefinition {
  /** Nombre del subcomando (ej. "sync", "status", "search"). */
  name: string;
  /** Breve descripción para la ayuda y el autocompletado. */
  description: string;
  /** Categoría o grupo al que pertenece (ej. "Provider Management", "Search"). */
  category?: string;
  /** Función para autocompletar argumentos posteriores. */
  getArgumentCompletions?: (args: string[]) => AutocompleteItem[];
  /** Handler que ejecuta el subcomando. Recibe los argumentos restantes ya parseados y el contexto. */
  handler: (args: string[], ctx: ExtensionCommandContext) => Promise<void> | void;
}
