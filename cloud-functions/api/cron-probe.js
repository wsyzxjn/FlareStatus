import {
  getBlobStore,
  getStoredServices,
  probeEndpoint,
  corsHeaders,
} from '../_shared.js';

export async function onRequest(context) {
  const store = getBlobStore();
  const services = await getStoredServices(store);
  const enabledServices = services.filter((s) => s.enabled);
  const results = [];

  for (const service of enabledServices) {
    const probeResult = await probeEndpoint(service);
    results.push({
      id: service.id,
      name: service.name,
      categoryId: service.categoryId,
      status: probeResult.status,
      latency: probeResult.latency,
      statusCode: probeResult.statusCode,
      error: probeResult.error,
      updatedAt: new Date().toISOString(),
    });
  }

  if (store) {
    try {
      await store.setJSON('state/latest_probe_results', results);
    } catch (_e) {}
  }

  return new Response(
    JSON.stringify({
      success: true,
      probedCount: enabledServices.length,
      timestamp: new Date().toISOString(),
      results,
    }),
    { headers: corsHeaders }
  );
}
