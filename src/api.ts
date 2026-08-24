// =========================================================================
// FlareStatus — Unified API Client
// =========================================================================

const API_BASE =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'status.tsuka.cn' || window.location.hostname.endsWith('.edgeone.cool'))
    ? 'https://status.amatsuka.net'
    : '';

export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const finalUrl = url.startsWith('/') && API_BASE ? `${API_BASE}${url}` : url;
  return fetch(finalUrl, {
    ...init,
  });
}
