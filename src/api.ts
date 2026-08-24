// =========================================================================
// FlareStatus — Unified API Client
// =========================================================================

export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    credentials: 'include',
    ...init,
  });
}
