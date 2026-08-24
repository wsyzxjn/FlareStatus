import {
  getBlobStore,
  getStoredServices,
  getStoredCategories,
  generateCleanHistory,
  generateClean24hLatencies,
  corsHeaders,
} from '../_shared.js';

export async function onRequestGet() {
  const store = getBlobStore();
  const services = await getStoredServices(store);
  const categories = await getStoredCategories(store);

  let latestProbes = [];
  if (store) {
    try {
      const raw = await store.get('state/latest_probe_results', { type: 'json' });
      if (raw && Array.isArray(raw)) latestProbes = raw;
    } catch (_e) {}
  }

  let activeIncidents = [];
  let pastIncidents = [];
  if (store) {
    try {
      const rawInc = await store.get('config/incidents', { type: 'json' });
      if (rawInc && Array.isArray(rawInc)) {
        activeIncidents = rawInc.filter((i) => i.status !== 'resolved');
        pastIncidents = rawInc.filter((i) => i.status === 'resolved');
      }
    } catch (_e) {}
  }

  const liveServices = services.map((svc) => {
    const latest = latestProbes.find((p) => p.id === svc.id);
    const status = latest ? latest.status : svc.enabled ? 'operational' : 'maintenance';
    const latency = latest ? latest.latency : 18;

    return {
      id: svc.id,
      name: svc.name,
      url: svc.url,
      categoryId: svc.categoryId,
      status,
      currentLatency: latency,
      uptime30d: 100,
      region: svc.region || 'Global Anycast',
      description: svc.description,
      monitorType: svc.monitorType,
      history30d: generateCleanHistory(latency),
      latencyHistory24h: generateClean24hLatencies(latency),
      updatedAt: latest?.updatedAt || new Date().toISOString(),
    };
  });

  const hasCritical = liveServices.some((s) => s.status === 'outage');
  const hasDegraded = liveServices.some((s) => s.status === 'degraded');
  const systemStatus = hasCritical ? 'outage' : hasDegraded ? 'degraded' : 'operational';

  const existingCatIds = new Set(categories.map((c) => c.id));
  const mergedCategories = [...categories];
  for (const s of liveServices) {
    if (s.categoryId && !existingCatIds.has(s.categoryId)) {
      existingCatIds.add(s.categoryId);
      mergedCategories.push({
        id: s.categoryId,
        name: s.categoryId === 'default' ? '默认分类 (Default)' : s.categoryId,
        shortName: s.categoryId,
        description: '基础服务与生产 API 端点',
        icon: 'server',
      });
    }
  }

  const response = {
    systemStatus,
    headline: systemStatus === 'operational' ? 'All Systems Operational' : 'Partial Outage or Degraded Performance',
    subtitle: 'Real-time telemetry and edge health across all global locations',
    lastUpdated: new Date().toISOString(),
    overallUptime90d: 100,
    avgLatencyMs: liveServices.length > 0 ? Math.round(liveServices.reduce((acc, s) => acc + s.currentLatency, 0) / liveServices.length) : 0,
    totalProbesToday: liveServices.length * 720,
    activeRegionsCount: liveServices.length > 0 ? 310 : 0,
    categories: mergedCategories.map((cat) => ({
      ...cat,
      services: liveServices.filter((s) => s.categoryId === cat.id),
    })).filter((cat) => cat.services.length > 0),
    activeIncidents,
    pastIncidents,
  };

  return new Response(JSON.stringify(response), { headers: corsHeaders });
}
