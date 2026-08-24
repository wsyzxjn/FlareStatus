// =========================================================================
// FlareStatus — Unified API Client with Cross-Platform Auth Forwarding
// Automatically forwards EdgeOne Preview Tokens & Credentials to API Calls
// =========================================================================

export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  let finalUrl = url;
  if (typeof window !== 'undefined' && window.location.search) {
    const search = window.location.search;
    if (search.includes('eo_token') || search.includes('eo_time')) {
      const sep = url.includes('?') ? '&' : '?';
      const cleanSearch = search.startsWith('?') ? search.substring(1) : search;
      finalUrl = `${url}${sep}${cleanSearch}`;
    }
  }

  return fetch(finalUrl, {
    credentials: 'include',
    ...init,
  });
}
