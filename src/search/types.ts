/** Configuración persistente de la extensión Requesty en ~/.pi/agent/pi-requesty.json */
export interface RequestyConfig {
  /** Activa o desactiva la búsqueda web nativa de Requesty. Default: false */
  nativeSearch?: boolean;
}

/** Definición de la tool de web search inyectada en el payload */
export interface RequestyWebSearchTool {
  type: "web_search";
  [key: string]: unknown;
}

/** Forma esperada del payload de OpenAI completions en before_provider_request */
export interface OpenAICompletionsPayload {
  model?: string;
  messages?: unknown[];
  tools?: Array<{ type: string; [key: string]: unknown }>;
  [key: string]: unknown;
}
