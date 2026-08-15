/** Provider identifier used throughout the extension. */
export const REQUESTY_PROVIDER_ID = "requesty";

/** Default Requesty router base URL (US region). */
export const DEFAULT_BASE_URL = "https://router.requesty.ai/v1";

/** EU region base URL fallback. */
export const DEFAULT_EU_BASE_URL = "https://router.eu.requesty.ai/v1";

/** Default context window size in tokens (fallback). */
export const DEFAULT_CONTEXT_WINDOW = 128_000;

/** Default maximum output tokens (fallback). */
export const DEFAULT_MAX_TOKENS = 4_096;

/** HTTP headers for analytics/tracing sent with every Requesty API call. */
export const REQUESTY_HEADERS: Record<string, string> = {
  "HTTP-Referer": "https://github.com/xinaps/pi-requesty-provider",
  "X-Title": "pi-requesty-provider",
};
