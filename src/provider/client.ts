import type { RequestyModelsResponse } from "./types.js";
import { DEFAULT_BASE_URL } from "./constants.js";
import { REQUESTY_HEADERS } from "../constants.js";

/**
 * Error thrown when the Requesty API returns a non-2xx response.
 */
export class RequestyApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly endpoint: string
  ) {
    super(`Requesty API error (${status}) at ${endpoint}: ${message}`);
    this.name = "RequestyApiError";
  }
}

/**
 * Fetch the list of models from the Requesty API.
 * @param baseUrl - The Requesty base URL (e.g., https://router.requesty.ai/v1).
 * @param apiKey - The API key for authentication.
 * @param signal - Optional AbortSignal for cancellation.
 * @returns Parsed model response.
 */
export async function fetchRequestyModels(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<RequestyModelsResponse> {
  const url = `${baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl}/models`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...REQUESTY_HEADERS,
    },
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const errorMsg = formatApiError(response.status, body);
    throw new RequestyApiError(response.status, errorMsg, url);
  }

  return response.json() as Promise<RequestyModelsResponse>;
}

/**
 * Validate an API key by making a lightweight request to /v1/models.
 * @param apiKey - The API key to validate.
 * @param baseUrl - The base URL (defaults to DEFAULT_BASE_URL).
 * @param signal - Optional AbortSignal.
 * @returns true if the key is valid, false otherwise.
 */
export async function validateApiKey(
  apiKey: string,
  baseUrl?: string,
  signal?: AbortSignal
): Promise<boolean> {
  try {
    const url = `${(baseUrl || DEFAULT_BASE_URL).endsWith("/") ? baseUrl!.slice(0, -1) : baseUrl || DEFAULT_BASE_URL}/models`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...REQUESTY_HEADERS,
      },
      signal,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Format an API error message based on HTTP status code.
 */
function formatApiError(status: number, body: string): string {
  switch (status) {
    case 401:
      return "Invalid API key. Check your credentials and try /login requesty.";
    case 402:
      return "Requesty credits exhausted. Please add credits to your organization.";
    case 403:
      return "Model not approved for your organization. Enable it at app.requesty.ai.";
    case 429:
      return "Rate limit exceeded. Please wait before making more requests.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Requesty server error. Please try again later.";
    default:
      return body || `HTTP ${status}`;
  }
}
