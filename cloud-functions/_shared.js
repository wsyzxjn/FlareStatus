// =========================================================================
// FlareStatus — Shared Backend Engine for EdgeOne Pages Functions
// Built-in EdgeOne Blob Storage (@edgeone/pages-blob)
// =========================================================================

import { getStore } from '@edgeone/pages-blob';

export const DEFAULT_SERVICES = [];

export const DEFAULT_CATEGORIES = [
  {
    id: 'default',
    name: '默认分类 (Default)',
    shortName: '默认',
    description: '基础服务与生产 API 端点',
    icon: 'server',
  },
];

export const DEFAULT_SETTINGS = {
  siteTitle: 'FlareStatus',
  siteSubtitle: 'Real-time telemetry and edge health across all global locations',
  targetSla: 99.9,
  probeInterval: 2,
  historyRetentionDays: 30,
};

export const DEFAULT_NOTIFICATIONS = [];

export function getBlobStore() {
  try {
    return getStore('flarestatus-store');
  } catch (err) {
    console.warn('[FlareStatus] Failed to get EdgeOne BlobStore:', err);
    return null;
  }
}

export function generateCleanHistory(baseLatency) {
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

export function generateClean24hLatencies(baseLatency) {
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

export function isAcceptedStatus(statusCode, pattern, fallback = 200) {
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

export function generateSvgBadge(serviceName, isHealthy, uptime) {
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

export async function probeEndpoint(service) {
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
      'User-Agent': 'FlareStatusProber/1.0 (EdgeOne Pages Node.js Cloud Functions)',
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

export async function getStoredServices(store) {
  if (store) {
    try {
      const data = await store.get('config/services', { type: 'json' });
      if (data && Array.isArray(data)) return data;
    } catch (_e) {}
  }
  return DEFAULT_SERVICES;
}

export async function getStoredCategories(store) {
  if (store) {
    try {
      const data = await store.get('config/categories', { type: 'json' });
      if (data && Array.isArray(data)) return data;
    } catch (_e) {}
  }
  return DEFAULT_CATEGORIES;
}

export const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};
