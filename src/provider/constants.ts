/** Provider identifier used throughout the extension. */
export const REQUESTY_PROVIDER_ID = "requesty";

/** Default Requesty router base URL (US region). */
export const DEFAULT_BASE_URL = "https://router.requesty.ai/v1";

/** EU region base URL fallback. */
export const DEFAULT_EU_BASE_URL = "https://router.eu.requesty.ai/v1";

/** Regional endpoints according to Requesty documentation. */
export const REQUESTY_ENDPOINTS = [
  {
    id: "https://router.requesty.ai/v1",
    label: "US (Global)",
    description: "https://router.requesty.ai/v1",
  },
  {
    id: "https://router.eu.requesty.ai/v1",
    label: "EU (Frankfurt)",
    description: "https://router.eu.requesty.ai/v1",
  },
] as const;

/** Default context window size in tokens (fallback). */
export const DEFAULT_CONTEXT_WINDOW = 128_000;

/** Default maximum output tokens (fallback). */
export const DEFAULT_MAX_TOKENS = 4_096;
