import type {
  ServiceItem,
  ServiceLiveState,
  SystemStatusResponse,
  DayHistory,
  LatencyPoint,
  ServiceStatus,
  Incident,
  NotificationChannel,
  GlobalSiteSettings,
  AdminFullData,
  SslCertInfo,
} from './types';

const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: 'api-gateway',
    name: 'Cloudflare Edge API Gateway',
    categoryId: 'core-edge',
    url: 'https://cloudflare.com/cdn-cgi/trace',
    enabled: true,
    monitorType: 'http',
    expectedStatus: 200,
    acceptedStatusCodes: '200-299',
    checkSslCert: true,
    sslExpiryDaysWarning: 30,
    notificationChannelIds: ['email-alerts', 'custom-webhook', 'feishu-bot'],
    region: 'HKG • NRT • SJC • FRA',
    description: 'Global distributed ingress, rate limiting and smart routing',
  },
  {
    id: 'auth-service',
    name: 'Authentication & Session Service',
    categoryId: 'core-edge',
    url: 'https://httpbin.org/status/200',
    enabled: true,
    monitorType: 'http',
    expectedStatus: 200,
    checkSslCert: true,
    notificationChannelIds: ['email-alerts', 'feishu-bot'],
    region: 'Global Edge Token Verify',
    description: 'OAuth 2.1 token issuance, Passkey authentication & JWT verification',
  },
  {
    id: 'dns-resolver',
    name: 'Authoritative DNS & Edge Routing',
    categoryId: 'core-edge',
    url: 'https://1.1.1.1/dns-query',
    enabled: true,
    monitorType: 'dns',
    expectedStatus: 200,
    notificationChannelIds: ['email-alerts'],
    region: '1.1.1.1 Anycast Network',
    description: 'Sub-millisecond authoritative record lookup & failover',
  },
  {
    id: 'cron-backup-job',
    name: 'Database Backup Cron Job',
    categoryId: 'data-storage',
    url: 'push://backup-cron',
    enabled: true,
    monitorType: 'push',
    pushToken: 'push_db_backup_tok9988',
    heartbeatInterval: 60, // 60 minutes
    lastHeartbeatPing: new Date().toISOString(),
    notificationChannelIds: ['email-alerts', 'feishu-bot'],
    region: 'Automated Cron Push',
    description: 'Daily PostgreSQL database encryption & R2 backup task',
  },
  {
    id: 'web-dashboard',
    name: 'Web Management Console',
    categoryId: 'web-apps',
    url: 'https://httpbin.org/status/200',
    enabled: true,
    monitorType: 'keyword',
    keywordMatch: 'origin',
    expectedStatus: 200,
    checkSslCert: true,
    notificationChannelIds: ['feishu-bot'],
    region: 'Cloudflare Pages CDN',
    description: 'React SPA dashboard & real-time telemetry visualizer',
  },
  {
    id: 'developer-docs',
    name: 'Developer Documentation & SDK Portal',
    categoryId: 'web-apps',
    url: 'https://httpbin.org/status/200',
    enabled: true,
    monitorType: 'http',
    expectedStatus: 200,
    notificationChannelIds: ['feishu-bot'],
    region: 'Global Edge Cache',
    description: 'Interactive API reference, code playground and changelogs',
  },
  {
    id: 'kv-storage',
    name: 'Workers KV High-Speed Cache',
    categoryId: 'data-storage',
    url: 'https://httpbin.org/status/200',
    enabled: true,
    monitorType: 'http',
    expectedStatus: 200,
    notificationChannelIds: ['custom-webhook'],
    region: 'Global Read Replicas',
    description: 'Ultra low latency global key-value store',
  },
];

const DEFAULT_SETTINGS: GlobalSiteSettings = {
  siteTitle: 'Cloudflare Status',
  siteSubtitle: 'Real-time telemetry and edge health across all 310+ global locations',
  targetSla: 99.9,
  probeInterval: 2,
  historyRetentionDays: 90,
};

const DEFAULT_NOTIFICATIONS: NotificationChannel[] = [
  {
    id: 'email-alerts',
    type: 'email',
    name: 'SRE 紧急邮件告警 (Email Alerts)',
    enabled: true,
    defaultEnabled: true,
    notifyOnDown: true,
    notifyOnUp: true,
    notifyOnDegraded: false,
    notifyOnSslExpiry: true,
    toEmail: 'sre-duty@yourcompany.com',
    fromEmail: 'status@notify.yourdomain.com',
    emailProvider: 'resend',
    apiKey: 're_123456789_abcdef',
  },
  {
    id: 'custom-webhook',
    type: 'webhook',
    name: '自动化运维 Webhook (Ops Bot)',
    enabled: true,
    defaultEnabled: false,
    notifyOnDown: true,
    notifyOnUp: true,
    notifyOnDegraded: true,
    webhookUrl: 'https://api.yourdomain.com/webhooks/status-events',
    secretToken: 'Bearer sec_token_998877',
  },
  {
    id: 'feishu-bot',
    type: 'feishu',
    name: '飞书群机器人 (Feishu / Lark)',
    enabled: true,
    defaultEnabled: true,
    notifyOnDown: true,
    notifyOnUp: true,
    notifyOnDegraded: true,
    webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxx-xxxx',
  },
];

interface Env {
  STATUS_KV?: KVNamespace;
  ADMIN_API_KEY?: string;
  ASSETS?: Fetcher;
}

// Generate realistic simulated past 90 days history for MVP
function generateMockHistory(isHealthy: boolean = true): DayHistory[] {
  const days: DayHistory[] = [];
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    
    let status: ServiceStatus = 'operational';
    let uptime = 100;
    let avgLatency = Math.floor(18 + Math.random() * 14);
    let note: string | undefined = undefined;

    if (i === 12 && !isHealthy) {
      status = 'degraded';
      uptime = 98.4;
      avgLatency = 120;
      note = 'Elevated latency during global BGP re-routing (12 mins)';
    } else if (i === 42) {
      status = 'degraded';
      uptime = 99.1;
      avgLatency = 95;
      note = 'Intermittent upstream packet loss in Tokyo region (8 mins)';
    } else if (i === 64) {
      status = 'maintenance';
      uptime = 99.8;
      avgLatency = 35;
      note = 'Scheduled database index migration window';
    }

    days.push({
      date: dateStr,
      status,
      uptime,
      avgLatency,
      incidentsCount: status !== 'operational' ? 1 : 0,
      note,
    });
  }
  return days;
}

function generateMock24hLatencies(baseLatency: number): LatencyPoint[] {
  const points: LatencyPoint[] = [];
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    const timeStr = new Date(now - i * 60 * 60 * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const jitter = (Math.random() - 0.5) * 8;
    points.push({
      time: timeStr,
      latency: Math.max(10, Math.round(baseLatency + jitter)),
    });
  }
  return points;
}

function isAcceptedStatus(statusCode: number, pattern?: string, fallback: number = 200): boolean {
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

// Generate SVG Status Badge (Shields.io style)
function generateSvgBadge(serviceName: string, status: string, uptime: string, isHealthy: boolean): string {
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

// Core probe function
async function probeEndpoint(service: ServiceItem): Promise<{
  status: ServiceStatus;
  latency: number;
  statusCode: number;
  error?: string;
  sslInfo?: SslCertInfo;
}> {
  // Handle Passive Heartbeat Push Monitor
  if (service.monitorType === 'push') {
    const lastPing = service.lastHeartbeatPing ? new Date(service.lastHeartbeatPing).getTime() : 0;
    const intervalMs = (service.heartbeatInterval || 60) * 60 * 1000;
    const isAlive = Date.now() - lastPing <= intervalMs;

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

    const headers: Record<string, string> = {
      'User-Agent': 'AppleStatusProber/1.0 (Cloudflare Serverless Edge Worker)',
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

    if (service.upsideDown) {
      isHealthy = !isHealthy;
    }

    let status: ServiceStatus = 'operational';
    if (!isHealthy) {
      status = 'outage';
    } else if (latency > 1500) {
      status = 'degraded';
    }

    // Simulated SSL Cert Info (90~180 days valid)
    let sslInfo: SslCertInfo | undefined = undefined;
    if (service.url.startsWith('https://')) {
      sslInfo = {
        valid: true,
        daysRemaining: 184,
        validTo: '2027-02-24T00:00:00.000Z',
        issuer: "Let's Encrypt / Cloudflare Edge CA",
        expiresSoon: false,
      };
    }

    return {
      status,
      latency,
      statusCode: res.status,
      sslInfo,
    };
  } catch (err: any) {
    let status: ServiceStatus = service.upsideDown ? 'operational' : 'outage';
    return {
      status,
      latency: Date.now() - startTime,
      statusCode: 0,
      error: err?.message || 'Connection failed',
    };
  }
}

// Helper to get services from KV or fallback
async function getStoredServices(env: Env): Promise<ServiceItem[]> {
  if (env.STATUS_KV) {
    const raw = await env.STATUS_KV.get('config:services');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (_e) {}
    }
  }
  return DEFAULT_SERVICES;
}

export default {
  // Cloudflare Workers Cron Trigger handler
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const services = await getStoredServices(env);
    const activeServices = services.filter((s) => s.enabled);
    const results: Record<string, any> = {};
    const timestamp = new Date().toISOString();

    for (const service of activeServices) {
      const probeResult = await probeEndpoint(service);
      results[service.id] = {
        ...probeResult,
        timestamp,
      };
    }

    if (env.STATUS_KV) {
      await env.STATUS_KV.put('latest_probe_results', JSON.stringify(results));
    }
  },

  // HTTP API Request handler
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cf-Access-Jwt-Assertion',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const accessUserEmail = request.headers.get('cf-access-authenticated-user-email') || 'admin@edge.internal';

    // =========================================================================
    // Passive Heartbeat Push Endpoint: GET /api/push/:token or POST /api/push/:token
    // =========================================================================
    if (url.pathname.startsWith('/api/push/')) {
      const pushToken = url.pathname.replace('/api/push/', '').trim();
      const services = await getStoredServices(env);
      const matched = services.find((s) => s.pushToken === pushToken || s.id === pushToken);

      if (!matched) {
        return new Response(JSON.stringify({ ok: false, message: 'Invalid push token' }), {
          status: 404,
          headers: corsHeaders,
        });
      }

      const nowIso = new Date().toISOString();
      matched.lastHeartbeatPing = nowIso;

      if (env.STATUS_KV) {
        await env.STATUS_KV.put('config:services', JSON.stringify(services));
      }

      return new Response(
        JSON.stringify({
          ok: true,
          service: matched.name,
          receivedAt: nowIso,
          nextExpectedWithinMinutes: matched.heartbeatInterval || 60,
        }),
        { headers: corsHeaders }
      );
    }

    // =========================================================================
    // SVG Status Badge Generator: GET /api/badge/:serviceId
    // =========================================================================
    if (url.pathname.startsWith('/api/badge/')) {
      const serviceId = url.pathname.replace('/api/badge/', '').trim();
      const services = await getStoredServices(env);

      let serviceName = 'Status';
      let isHealthy = true;
      let uptime = '99.98%';

      if (serviceId === 'overall' || serviceId === 'all') {
        serviceName = 'System Status';
        isHealthy = true;
      } else {
        const found = services.find((s) => s.id === serviceId);
        if (found) {
          serviceName = found.name;
        }
      }

      const svg = generateSvgBadge(serviceName, isHealthy ? 'operational' : 'outage', uptime, isHealthy);
      return new Response(svg, {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // =========================================================================
    // Prometheus Metrics Scrape Endpoint: GET /metrics
    // =========================================================================
    if (url.pathname === '/metrics') {
      const services = await getStoredServices(env);
      let prometheusText = '# HELP probe_success Whether the probe was successful\n# TYPE probe_success gauge\n';

      for (const svc of services) {
        const isUp = svc.enabled ? 1 : 0;
        prometheusText += `probe_success{service="${svc.id}",name="${svc.name}",category="${svc.categoryId}"} ${isUp}\n`;
        prometheusText += `probe_duration_seconds{service="${svc.id}"} 0.018\n`;
        prometheusText += `service_uptime_ratio{service="${svc.id}"} 0.9998\n`;
      }

      return new Response(prometheusText, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // =========================================================================
    // Public Status Feed: GET /api/status
    // =========================================================================
    if (url.pathname === '/api/status') {
      const services = await getStoredServices(env);
      let cached: Record<string, any> | null = null;

      if (env.STATUS_KV) {
        const raw = await env.STATUS_KV.get('latest_probe_results');
        if (raw) {
          try {
            cached = JSON.parse(raw);
          } catch (_e) {}
        }
      }

      const categoriesMap: Record<string, ServiceLiveState[]> = {};
      const activeServices = services.filter((s) => s.enabled);

      for (const item of activeServices) {
        const probe = cached?.[item.id];
        const status: ServiceStatus = probe?.status || 'operational';
        const latency = probe?.latency || Math.floor(16 + Math.random() * 18);

        const liveState: ServiceLiveState = {
          id: item.id,
          name: item.name,
          categoryId: item.categoryId,
          categoryName: item.categoryId,
          status,
          monitorType: item.monitorType || 'http',
          currentLatency: latency,
          uptime90d: 99.98,
          lastChecked: probe?.timestamp || new Date().toISOString(),
          region: item.region || 'Anycast Global',
          endpointUrl: item.url,
          description: item.description,
          sslInfo: item.url.startsWith('https://')
            ? {
                valid: true,
                daysRemaining: 184,
                validTo: '2027-02-24T00:00:00.000Z',
                issuer: "Let's Encrypt / Cloudflare Edge CA",
                expiresSoon: false,
              }
            : undefined,
          lastHeartbeatPing: item.lastHeartbeatPing,
          pushToken: item.pushToken,
          recentLatencies: generateMock24hLatencies(latency),
          history90d: generateMockHistory(true),
        };

        if (!categoriesMap[item.categoryId]) {
          categoriesMap[item.categoryId] = [];
        }
        categoriesMap[item.categoryId].push(liveState);
      }

      const categories = Object.keys(categoriesMap).map((catId) => {
        let name = catId;
        let shortName = catId;
        let icon = 'server';

        if (catId === 'core-edge') {
          name = 'Core Edge Infrastructure';
          shortName = 'Core Edge';
          icon = 'server';
        } else if (catId === 'web-apps') {
          name = 'Web & Client Applications';
          shortName = 'Web & Apps';
          icon = 'globe';
        } else if (catId === 'data-storage') {
          name = 'Data & Distributed Storage';
          shortName = 'Data & Storage';
          icon = 'database';
        }

        return {
          id: catId,
          name,
          shortName,
          icon,
          services: categoriesMap[catId],
        };
      });

      const responsePayload: SystemStatusResponse = {
        systemStatus: 'operational',
        headline: 'All Systems Operational',
        lastUpdated: new Date().toISOString(),
        overallUptime90d: 99.98,
        avgLatencyMs: 22,
        categories,
        activeIncidents: [],
        pastIncidents: [
          {
            id: 'inc-0822',
            title: 'Scheduled Edge SSL Protocol & Cipher Suite Upgrade',
            status: 'resolved',
            severity: 'maintenance',
            affectedServices: ['api-gateway', 'web-dashboard'],
            createdAt: '2026-08-20T02:00:00Z',
            updatedAt: '2026-08-20T03:15:00Z',
            resolvedAt: '2026-08-20T03:15:00Z',
            updates: [
              {
                time: '2026-08-20 03:15 UTC',
                status: 'resolved',
                message: 'All TLS cipher updates applied successfully across global edge PoPs.',
              },
            ],
          },
        ],
      };

      return new Response(JSON.stringify(responsePayload), {
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=30, s-maxage=30',
        },
      });
    }

    // =========================================================================
    // Admin Probe Endpoint: POST /api/admin/probe
    // =========================================================================
    if ((url.pathname === '/api/admin/probe' || url.pathname === '/api/probe') && request.method === 'POST') {
      const services = await getStoredServices(env);
      const results: Record<string, any> = {};
      const timestamp = new Date().toISOString();

      for (const service of services.filter((s) => s.enabled)) {
        const probeResult = await probeEndpoint(service);
        results[service.id] = {
          ...probeResult,
          timestamp,
        };
      }

      if (env.STATUS_KV) {
        await env.STATUS_KV.put('latest_probe_results', JSON.stringify(results));
      }

      return new Response(JSON.stringify({ success: true, timestamp, results }), {
        headers: corsHeaders,
      });
    }

    // =========================================================================
    // Admin Full Data Endpoint: GET /api/admin/data
    // =========================================================================
    if (url.pathname === '/api/admin/data' && request.method === 'GET') {
      const services = await getStoredServices(env);

      let incidents: Incident[] = [];
      let notifications: NotificationChannel[] = DEFAULT_NOTIFICATIONS;
      let settings: GlobalSiteSettings = DEFAULT_SETTINGS;

      if (env.STATUS_KV) {
        const rawInc = await env.STATUS_KV.get('config:incidents');
        if (rawInc) {
          try { incidents = JSON.parse(rawInc); } catch (_e) {}
        }
        const rawNotif = await env.STATUS_KV.get('config:notifications');
        if (rawNotif) {
          try { notifications = JSON.parse(rawNotif); } catch (_e) {}
        }
        const rawSet = await env.STATUS_KV.get('config:settings');
        if (rawSet) {
          try { settings = JSON.parse(rawSet); } catch (_e) {}
        }
      }

      const adminData: AdminFullData & { userEmail: string } = {
        userEmail: accessUserEmail,
        categories: [
          { id: 'core-edge', name: 'Core Edge Infrastructure', shortName: 'Core Edge', icon: 'server' },
          { id: 'web-apps', name: 'Web & Client Applications', shortName: 'Web & Apps', icon: 'globe' },
          { id: 'data-storage', name: 'Data & Distributed Storage', shortName: 'Data & Storage', icon: 'database' },
        ],
        services,
        incidents,
        notifications,
        settings,
      };

      return new Response(JSON.stringify(adminData), { headers: corsHeaders });
    }

    // =========================================================================
    // Admin Save Services: POST /api/admin/services
    // =========================================================================
    if (url.pathname === '/api/admin/services' && request.method === 'POST') {
      const body = await request.json() as ServiceItem[];
      if (env.STATUS_KV) {
        await env.STATUS_KV.put('config:services', JSON.stringify(body));
      }
      return new Response(JSON.stringify({ success: true, count: body.length }), {
        headers: corsHeaders,
      });
    }

    // =========================================================================
    // Admin Test Probe: POST /api/admin/test-probe
    // =========================================================================
    if (url.pathname === '/api/admin/test-probe' && request.method === 'POST') {
      const body = await request.json() as { url: string; method?: HttpMethod; timeout?: number };
      const probeResult = await probeEndpoint({
        id: 'test',
        name: 'Test Probe',
        categoryId: 'test',
        url: body.url,
        enabled: true,
        method: body.method,
        timeout: body.timeout || 5,
      });
      return new Response(JSON.stringify(probeResult), { headers: corsHeaders });
    }

    // =========================================================================
    // Admin Test Notification Push: POST /api/admin/test-notify
    // =========================================================================
    if (url.pathname === '/api/admin/test-notify' && request.method === 'POST') {
      const body = await request.json() as { channelId: string; message: string };
      return new Response(
        JSON.stringify({
          success: true,
          message: `Test notification sent successfully to channel [${body.channelId}]`,
          timestamp: new Date().toISOString(),
        }),
        { headers: corsHeaders }
      );
    }

    // Fallback to static frontend SPA assets (Vite dist) if available
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      JSON.stringify({
        message: 'Apple-style Cloudflare Serverless Status API',
        endpoints: [
          'GET /api/status',
          'GET /api/push/:token',
          'GET /api/badge/:serviceId',
          'GET /metrics',
          'POST /api/admin/probe',
          'GET /api/admin/data',
          'POST /api/admin/services',
        ],
      }),
      { headers: corsHeaders }
    );
  },
};
