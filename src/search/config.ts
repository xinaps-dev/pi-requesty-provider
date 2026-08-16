import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DEFAULT_REQUESTY_CONFIG, REQUESTY_CONFIG_FILENAME } from "./constants.js";
import type { RequestyConfig } from "./types.js";

/** Obtiene la ruta absoluta al archivo pi-requesty.json */
export function getRequestyConfigPath(): string {
  try {
    return join(getAgentDir(), REQUESTY_CONFIG_FILENAME);
  } catch {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    return join(home, ".pi", "agent", REQUESTY_CONFIG_FILENAME);
  }
}

/** Lee la configuración actual de ~/.pi/agent/pi-requesty.json */
export async function getRequestyConfig(): Promise<RequestyConfig> {
  const filePath = getRequestyConfigPath();
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      nativeSearch: typeof parsed.nativeSearch === "boolean"
        ? parsed.nativeSearch
        : DEFAULT_REQUESTY_CONFIG.nativeSearch,
    };
  } catch {
    return { ...DEFAULT_REQUESTY_CONFIG };
  }
}

/** Guarda cambios parciales en la configuración de forma persistente */
export async function setRequestyConfig(
  updates: Partial<RequestyConfig>
): Promise<RequestyConfig> {
  const current = await getRequestyConfig();
  const nextConfig: RequestyConfig = { ...current, ...updates };
  const filePath = getRequestyConfigPath();

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify(nextConfig, null, 2)}\n`,
    "utf8"
  );

  return nextConfig;
}

/** Comprueba si la búsqueda web nativa está habilitada */
export async function isNativeSearchEnabled(): Promise<boolean> {
  const config = await getRequestyConfig();
  return config.nativeSearch === true;
}
