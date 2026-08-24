// =========================================================================
// Prometheus Scrape Endpoint: GET /metrics
// =========================================================================

import { getStore } from '@edgeone/pages-blob';

export async function onRequestGet() {
  let services = [];
  try {
    const store = getStore('flarestatus-store');
    const data = await store.get('config/services', { type: 'json' });
    if (data && Array.isArray(data)) services = data;
  } catch (_e) {}

  let metricsOutput = '# HELP flarestatus_service_up Status of service (1 = UP, 0 = DOWN)\n';
  metricsOutput += '# TYPE flarestatus_service_up gauge\n';

  for (const svc of services) {
    const isUp = svc.enabled ? 1 : 0;
    const safeId = (svc.id || '').replace(/"/g, '');
    const safeName = (svc.name || '').replace(/"/g, '');
    metricsOutput += `flarestatus_service_up{id="${safeId}",name="${safeName}"} ${isUp}\n`;
  }

  return new Response(metricsOutput, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
