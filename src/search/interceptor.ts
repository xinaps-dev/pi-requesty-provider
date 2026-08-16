import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { REQUESTY_PROVIDER_ID } from "../provider/constants.js";
import { getCachedModels } from "../provider/index.js";
import type { RequestyPiModel } from "../provider/types.js";
import { REQUESTY_WEB_SEARCH_TOOL_TYPE } from "./constants.js";
import { isNativeSearchEnabled } from "./config.js";
import type { OpenAICompletionsPayload } from "./types.js";

/** Evento recibido en pi.on("before_provider_request", ...) */
export interface BeforeProviderRequestEvent {
  type: "before_provider_request";
  payload: unknown;
}

/**
 * Comprueba si un modelo es Google Gemini o Vertex Gemini.
 * La API de Gemini no permite combinar herramientas integradas ({google_search}) con function calling en la misma petición.
 */
export function isGeminiModel(modelId: string): boolean {
  return modelId.startsWith("google/gemini") || modelId.startsWith("vertex/gemini");
}

/**
 * Intercepta la petición al proveedor antes de enviarse.
 * Si el proveedor es Requesty, la búsqueda nativa está en 'on' y el modelo lo soporta,
 * inyecta { type: "web_search" } en payload.tools.
 */
export async function handleNativeSearchBeforeProviderRequest(
  event: BeforeProviderRequestEvent,
  ctx: ExtensionContext
): Promise<unknown> {
  const payload = event.payload;

  // 1. Validar que el payload sea un objeto válido
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  // 2. Comprobar que el proveedor sea estrictamente Requesty
  const currentModel = ctx.model;
  if (currentModel?.provider !== REQUESTY_PROVIDER_ID) {
    return undefined;
  }

  // 3. Comprobar si la búsqueda nativa está activada por configuración
  const enabled = await isNativeSearchEnabled();
  if (!enabled) {
    return undefined;
  }

  // 4. Comprobar si el modelo activo soporta búsqueda nativa
  let supportsWebSearch = (currentModel as RequestyPiModel).supportsWebSearch;

  // Si no viene directo en ctx.model, consultar en el catálogo en memoria
  if (supportsWebSearch === undefined) {
    const cached = getCachedModels().find((m) => m.id === currentModel.id) as RequestyPiModel | undefined;
    supportsWebSearch = cached?.supportsWebSearch === true;
  }

  // Si el modelo no lo soporta, no inyectar nada y continuar silenciosamente
  if (!supportsWebSearch) {
    return undefined;
  }

  // 5. Excluir modelos Google/Vertex Gemini para evitar error 400 por conflicto
  // entre built-in google_search y function calling de pi
  if (isGeminiModel(currentModel.id)) {
    return undefined;
  }

  // 6. Inyectar la herramienta en payload.tools evitando duplicados
  const p = payload as OpenAICompletionsPayload;
  const existingTools = Array.isArray(p.tools) ? [...p.tools] : [];

  const alreadyHasWebSearch = existingTools.some(
    (t) => t && typeof t === "object" && t.type === REQUESTY_WEB_SEARCH_TOOL_TYPE
  );

  if (alreadyHasWebSearch) {
    return undefined;
  }

  const updatedTools = [
    ...existingTools,
    { type: REQUESTY_WEB_SEARCH_TOOL_TYPE },
  ];

  return {
    ...p,
    tools: updatedTools,
  };
}
