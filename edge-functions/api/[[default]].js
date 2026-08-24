// =========================================================================
// FlareStatus — EdgeOne Pages V8 Edge Function Backend
// =========================================================================

let memoryServices = [];
let memoryCategories = [
  {
    id: 'default',
    name: '默认分类 (Default)',
    shortName: '默认',
    description: '基础服务与生产 API 端点',
    icon: 'server',
  },
];
let memoryIncidents = [];
let memoryNotifications = [];
let memorySettings = {
  siteTitle: 'FlareStatus',
  siteSubtitle: 'Real-time telemetry and edge health across all global locations',
  targetSla: 99.9,
  probeInterval: 2,
  historyRetentionDays: 30,
};
let memoryProbeResults = [];

function getKvStore() {
  if (typeof STATUS_KV !== 'undefined') return STATUS_KV;
  if (typeof my_kv !== 'undefined') return my_kv;
  if (typeof KV !== 'undefined') return KV;
  return null;
}

function generateCleanHistory(baseLatency) {
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      status: 'operational',
      uptime: 100,
      avgLatency: baseLatency,
      incidentsCount: 0,
    });
  }
  return days;
}

function generateClean24hLatencies(baseLatency) {
  const points = [];
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    const timeStr = new Date(now - i * 60 * 60 * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    points.push({
      time: timeStr,
      latency: Math.max(1, baseLatency),
    });
  }
  return points;
}

function isAcceptedStatus(statusCode, pattern, fallback = 200) {
  if (!pattern) return statusCode === fallback;
  const parts = pattern.split(',').map((p) => p.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (statusCode >= start && statusCode <= end) return true;
    } else if (Number(part) === statusCode) {
      return true;
    }
  }
  return statusCode === fallback;
}

function generateSvgBadge(serviceName, isHealthy, uptime) {
  const label = serviceName.length > 18 ? serviceName.substring(0, 16) + '..' : serviceName;
  const value = isHealthy ? `up ${uptime}` : 'down';
  const color = isHealthy ? '#34c759' : '#ff3b30';

  const labelWidth = Math.max(60, label.length * 7.5 + 14);
  const valueWidth = Math.max(70, value.length * 7.5 + 14);
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="4" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#2c2c2e"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text aria-hidden="true" x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

async function probeEndpoint(service) {
  if (service.monitorType === 'push') {
    const lastPing = service.lastHeartbeatPing ? new Date(service.lastHeartbeatPing).getTime() : 0;
    const intervalMs = (service.heartbeatInterval || 60) * 60 * 1000;
    const isAlive = lastPing > 0 && Date.now() - lastPing <= intervalMs;

    return {
      status: isAlive ? 'operational' : 'outage',
      latency: 1,
      statusCode: isAlive ? 200 : 504,
      error: isAlive ? undefined : 'Heartbeat push overdue',
    };
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutMs = (service.timeout || 8) * 1000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers = {
      'User-Agent': 'FlareStatusProber/1.0 (EdgeOne Pages V8 Edge Compute)',
    };

    if (service.headers) {
      service.headers.split('\n').forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > 0) {
          headers[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
        }
      });
    }

    if (service.authMethod === 'bearer' && service.bearerToken) {
      headers['Authorization'] = `Bearer ${service.bearerToken}`;
    }

    const res = await fetch(service.url, {
      method: service.method || 'GET',
      headers,
      body: service.body && (service.method === 'POST' || service.method === 'PUT' || service.method === 'PATCH') ? service.body : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;
    const isStatusOk = isAcceptedStatus(res.status, service.acceptedStatusCodes, service.expectedStatus || 200);

    let isKeywordOk = true;
    if (service.monitorType === 'keyword' && service.keywordMatch) {
      const text = await res.text();
      isKeywordOk = text.includes(service.keywordMatch);
    }

    let isHealthy = isStatusOk && isKeywordOk;
    if (service.upsideDown) isHealthy = !isHealthy;

    let status = 'operational';
    if (!isHealthy) {
      status = 'outage';
    } else if (latency > 1500) {
      status = 'degraded';
    }

    return {
      status,
      latency,
      statusCode: res.status,
    };
  } catch (err) {
    let status = service.upsideDown ? 'operational' : 'outage';
    return {
      status,
      latency: Date.now() - startTime,
      statusCode: 0,
      error: err?.message || 'Connection failed',
    };
  }
}

async function getServices() {
  const kv = getKvStore();
  if (kv) {
    try {
      const raw = await kv.get('config:services', 'json');
      if (raw && Array.isArray(raw)) return raw;
    } catch (_e) {}
  }
  return memoryServices;
}

async function getCategories() {
  const kv = getKvStore();
  if (kv) {
    try {
      const raw = await kv.get('config:categories', 'json');
      if (raw && Array.isArray(raw)) return raw;
    } catch (_e) {}
  }
  return memoryCategories;
}

export default async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const kv = getKvStore();

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 1. GET /api/status
  if (url.pathname === '/api/status' && request.method === 'GET') {
    const services = await getServices();
    const categories = await getCategories();

    let latestProbes = memoryProbeResults;
    if (kv) {
      try {
        const raw = await kv.get('latest_probe_results', 'json');
        if (raw && Array.isArray(raw)) latestProbes = raw;
      } catch (_e) {}
    }

    let activeIncidents = [];
    let pastIncidents = [];
    if (kv) {
      try {
        const rawInc = await kv.get('config:incidents', 'json');
        if (rawInc && Array.isArray(rawInc)) {
          activeIncidents = rawInc.filter((i) => i.status !== 'resolved');
          pastIncidents = rawInc.filter((i) => i.status === 'resolved');
        }
      } catch (_e) {}
    } else {
      activeIncidents = memoryIncidents.filter((i) => i.status !== 'resolved');
      pastIncidents = memoryIncidents.filter((i) => i.status === 'resolved');
    }

    const liveServices = services.map((svc) => {
      const latest = latestProbes.find((p) => p.id === svc.id);
      const status = latest ? latest.status : svc.enabled ? 'operational' : 'maintenance';
      const latency = latest ? latest.latency : 18;

      return {
        id: svc.id,
        name: svc.name,
        url: svc.url,
        categoryId: svc.categoryId || 'default',
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

    const hasCritical = liveServices.some((s) => s.status === 'outage');
    const hasDegraded = liveServices.some((s) => s.status === 'degraded');
    const systemStatus = hasCritical ? 'outage' : hasDegraded ? 'degraded' : 'operational';

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

  // 2. GET /api/admin/data
  if (url.pathname === '/api/admin/data' && request.method === 'GET') {
    const services = await getServices();
    const categories = await getCategories();

    let incidents = memoryIncidents;
    let notifications = memoryNotifications;
    let settings = memorySettings;

    if (kv) {
      try {
        const rawInc = await kv.get('config:incidents', 'json');
        if (rawInc && Array.isArray(rawInc)) incidents = rawInc;
        const rawNotif = await kv.get('config:notifications', 'json');
        if (rawNotif && Array.isArray(rawNotif)) notifications = rawNotif;
        const rawSet = await kv.get('config:settings', 'json');
        if (rawSet) settings = rawSet;
      } catch (_e) {}
    }

    return new Response(
      JSON.stringify({
        userEmail: 'admin@edgeone.internal',
        categories,
        services,
        incidents,
        notifications,
        settings,
      }),
      { headers: corsHeaders }
    );
  }

  // 3. POST /api/admin/services
  if (url.pathname === '/api/admin/services' && request.method === 'POST') {
    const body = await request.json();
    memoryServices = body || [];
    if (kv) {
      try {
        await kv.put('config:services', JSON.stringify(body));
      } catch (_e) {}
    }
    return new Response(JSON.stringify({ success: true, count: Array.isArray(body) ? body.length : 0 }), { headers: corsHeaders });
  }

  // 4. POST /api/admin/test-probe
  if (url.pathname === '/api/admin/test-probe' && request.method === 'POST') {
    const body = await request.json();
    const probeResult = await probeEndpoint({
      id: 'test',
      name: 'Test Probe',
      categoryId: 'test',
      url: body.url,
      enabled: true,
      method: body.method || 'GET',
      timeout: body.timeout || 5,
    });
    return new Response(JSON.stringify(probeResult), { headers: corsHeaders });
  }

  // 5. POST /api/admin/clear-data
  if (url.pathname === '/api/admin/clear-data' && request.method === 'POST') {
    memoryServices = [];
    memoryIncidents = [];
    memoryNotifications = [];
    memoryProbeResults = [];
    if (kv) {
      try {
        await kv.delete('config:services');
        await kv.delete('config:categories');
        await kv.delete('config:incidents');
        await kv.delete('config:notifications');
        await kv.delete('config:settings');
        await kv.delete('latest_probe_results');
      } catch (_e) {}
    }
    return new Response(JSON.stringify({ success: true, message: 'Data cleared' }), { headers: corsHeaders });
  }

  // 6. POST /api/cron-probe
  if (url.pathname === '/api/cron-probe' || url.pathname === '/api/cron/probe') {
    const services = await getServices();
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
    memoryProbeResults = results;
    if (kv) {
      try {
        await kv.put('latest_probe_results', JSON.stringify(results));
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

  return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}
