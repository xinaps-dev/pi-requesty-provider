/** Nombre del archivo de configuración persistente en ~/.pi/agent/ */
export const REQUESTY_CONFIG_FILENAME = "pi-requesty.json";

/** Tipo de herramienta requerido por el API de Requesty para búsqueda web */
export const REQUESTY_WEB_SEARCH_TOOL_TYPE = "web_search";

/** Configuración por defecto */
export const DEFAULT_REQUESTY_CONFIG = {
  nativeSearch: false,
} as const;
