// =========================================================================
// FlareStatus — Unified API Client
// =========================================================================

export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    credentials: 'same-origin',
  });
}

/**
 * Raised when an API route answers with something other than JSON — typically
 * an HTML page, because the backend functions are not mounted and a
 * single-page-application fallback served index.html instead.
 */
export class NonJsonResponseError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Expected JSON but the API returned a non-JSON body (HTTP ${status})`);
    this.name = 'NonJsonResponseError';
    this.status = status;
  }
}

/**
 * Parses a response body as JSON. Reading the body as text first means a
 * non-JSON payload raises a describable error instead of leaking the parser's
 * own message ("Unexpected token '<'") into the interface.
 */
export async function readJson<T = unknown>(response: Response): Promise<T> {
  const body = await response.text();
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new NonJsonResponseError(response.status);
  }
}
