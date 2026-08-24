import { SystemStatusData, DayHistory, LatencyPoint, CategoryConfig } from './types';

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    id: 'core-edge',
    name: 'Core Edge Infrastructure',
    shortName: 'Core Edge',
    description: 'Global Anycast routing, SSL termination, and API Edge proxies',
    icon: 'server',
  },
  {
    id: 'web-apps',
    name: 'Web & Client Applications',
    shortName: 'Web & Apps',
    description: 'Customer management console, documentation, and client portals',
    icon: 'globe',
  },
  {
    id: 'data-storage',
    name: 'Data & Distributed Storage',
    shortName: 'Data & Storage',
    description: 'Key-value cache, relational D1 database, and R2 object storage',
    icon: 'database',
  },
];

// Helper to generate 90 days of status history
function generate90Days(uptimeFactor: number = 0.999): DayHistory[] {
  const history: DayHistory[] = [];
  const now = new Date();
  
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    
    let status: 'operational' | 'degraded' | 'outage' | 'maintenance' = 'operational';
    let uptime = 100;
    let avgLatency = Math.floor(18 + Math.random() * 15);
    let note: string | undefined = undefined;

    if (i === 12 && uptimeFactor < 0.9995) {
      status = 'degraded';
      uptime = 98.4;
      avgLatency = 120;
      note = 'Elevated latency during global BGP re-routing (12 mins)';
    } else if (i === 38 && uptimeFactor < 0.999) {
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

    history.push({
      date: dateStr,
      status,
      uptime,
      avgLatency,
      incidentsCount: status !== 'operational' ? 1 : 0,
      note,
    });
  }
  return history;
}

function generate24hLatencies(baseLatency: number): LatencyPoint[] {
  const points: LatencyPoint[] = [];
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    const d = new Date(now - i * 60 * 60 * 1000);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:00`;
    const jitter = Math.sin(i / 3) * 6 + (Math.random() - 0.5) * 4;
    points.push({
      time: timeStr,
      latency: Math.max(8, Math.round(baseLatency + jitter)),
    });
  }
  return points;
}

export const INITIAL_STATUS_DATA: SystemStatusData = {
  systemStatus: 'operational',
  headline: 'All Systems Operational',
  subtitle: 'Real-time telemetry and edge health across all 310+ global locations',
  lastUpdated: new Date().toISOString(),
  overallUptime90d: 99.98,
  avgLatencyMs: 22,
  totalProbesToday: 14400,
  activeRegionsCount: 310,
  categories: [
    {
      id: 'core-edge',
      name: 'Core Edge Infrastructure',
      shortName: 'Core Edge',
      description: 'Global Anycast routing, SSL termination, and API Edge proxies',
      icon: 'server',
      services: [
        {
          id: 'api-gateway',
          name: 'Cloudflare Edge API Gateway',
          categoryId: 'core-edge',
          status: 'operational',
          currentLatency: 18,
          uptime90d: 99.99,
          lastChecked: 'Just now',
          region: 'HKG • NRT • SJC • FRA',
          endpointUrl: 'https://api.example.com/health',
          description: 'Global distributed ingress, rate limiting and smart routing',
          recentLatencies: generate24hLatencies(18),
          history90d: generate90Days(0.9999),
        },
        {
          id: 'auth-session',
          name: 'Identity & Authentication Service',
          categoryId: 'core-edge',
          status: 'operational',
          currentLatency: 24,
          uptime90d: 99.98,
          lastChecked: 'Just now',
          region: 'Global Edge Token Verify',
          endpointUrl: 'https://auth.example.com/v1/health',
          description: 'OAuth 2.1 token issuance, Passkey authentication & JWT verification',
          recentLatencies: generate24hLatencies(24),
          history90d: generate90Days(0.9998),
        },
        {
          id: 'dns-resolver',
          name: 'Authoritative DNS & Edge Routing',
          categoryId: 'core-edge',
          status: 'operational',
          currentLatency: 12,
          uptime90d: 100,
          lastChecked: 'Just now',
          region: '1.1.1.1 Anycast Network',
          endpointUrl: 'https://1.1.1.1/dns-query',
          description: 'Sub-millisecond authoritative record lookup & failover',
          recentLatencies: generate24hLatencies(12),
          history90d: generate90Days(1.0),
        },
      ],
    },
    {
      id: 'web-apps',
      name: 'Web & Client Applications',
      shortName: 'Web & Apps',
      description: 'Customer management console, documentation, and client portals',
      icon: 'globe',
      services: [
        {
          id: 'console-web',
          name: 'Web Management Console',
          categoryId: 'web-apps',
          status: 'operational',
          currentLatency: 32,
          uptime90d: 99.97,
          lastChecked: 'Just now',
          region: 'Cloudflare Pages CDN',
          endpointUrl: 'https://console.example.com',
          description: 'React SPA dashboard & real-time telemetry visualizer',
          recentLatencies: generate24hLatencies(32),
          history90d: generate90Days(0.999),
        },
        {
          id: 'docs-portal',
          name: 'Developer Documentation & SDK Portal',
          categoryId: 'web-apps',
          status: 'operational',
          currentLatency: 21,
          uptime90d: 99.99,
          lastChecked: 'Just now',
          region: 'Global Edge Cache',
          endpointUrl: 'https://docs.example.com',
          description: 'Interactive API reference, code playground and changelogs',
          recentLatencies: generate24hLatencies(21),
          history90d: generate90Days(0.9999),
        },
      ],
    },
    {
      id: 'data-storage',
      name: 'Data & Distributed Storage',
      shortName: 'Data & Storage',
      description: 'Key-value cache, relational D1 database, and R2 object storage',
      icon: 'database',
      services: [
        {
          id: 'kv-cache',
          name: 'Workers KV High-Speed Cache',
          categoryId: 'data-storage',
          status: 'operational',
          currentLatency: 15,
          uptime90d: 99.99,
          lastChecked: 'Just now',
          region: 'Global Read Replicas',
          endpointUrl: 'https://kv.example.internal/ping',
          description: 'Ultra low latency global key-value store',
          recentLatencies: generate24hLatencies(15),
          history90d: generate90Days(0.9999),
        },
        {
          id: 'd1-relational',
          name: 'Cloudflare D1 Relational Engine',
          categoryId: 'data-storage',
          status: 'operational',
          currentLatency: 28,
          uptime90d: 99.96,
          lastChecked: 'Just now',
          region: 'Multi-Region Replicas',
          endpointUrl: 'https://db.example.internal/healthcheck',
          description: 'Serverless SQLite with instant read replication',
          recentLatencies: generate24hLatencies(28),
          history90d: generate90Days(0.9995),
        },
        {
          id: 'r2-storage',
          name: 'R2 Object Storage & Asset CDN',
          categoryId: 'data-storage',
          status: 'operational',
          currentLatency: 22,
          uptime90d: 100,
          lastChecked: 'Just now',
          region: 'Global Tiered Cache',
          endpointUrl: 'https://assets.example.com/ping.txt',
          description: 'Zero egress cost S3-compatible asset store',
          recentLatencies: generate24hLatencies(22),
          history90d: generate90Days(1.0),
        },
      ],
    },
  ],
  activeIncidents: [],
  pastIncidents: [
    {
      id: 'inc-0822',
      title: 'Scheduled Edge SSL Protocol & Cipher Suite Upgrade',
      status: 'resolved',
      severity: 'maintenance',
      affectedServices: ['Cloudflare Edge API Gateway', 'Web Management Console'],
      createdAt: '2026-08-20T02:00:00Z',
      updatedAt: '2026-08-20T03:15:00Z',
      resolvedAt: '2026-08-20T03:15:00Z',
      updates: [
        {
          time: '2026-08-20 03:15 UTC',
          status: 'resolved',
          message: 'Maintenance completed. All TLS 1.3 quantum-resistant key exchange algorithms verified healthy across edge nodes.',
        },
        {
          time: '2026-08-20 02:45 UTC',
          status: 'monitoring',
          message: 'Applying rolling restart to Asia-Pacific edge proxies. Traffic draining operating as expected.',
        },
        {
          time: '2026-08-20 02:00 UTC',
          status: 'investigating',
          message: 'Scheduled maintenance started as planned. Zero downtime expected.',
        },
      ],
    },
    {
      id: 'inc-0810',
      title: 'Transient Latency Spike in Tokyo (NRT) Region',
      status: 'resolved',
      severity: 'minor',
      affectedServices: ['Identity & Authentication Service'],
      createdAt: '2026-08-10T08:14:00Z',
      updatedAt: '2026-08-10T08:26:00Z',
      resolvedAt: '2026-08-10T08:26:00Z',
      updates: [
        {
          time: '2026-08-10 08:26 UTC',
          status: 'resolved',
          message: 'Upstream transit provider rerouted fiber path. Latency metrics returned to nominal 18ms baseline.',
        },
        {
          time: '2026-08-10 08:14 UTC',
          status: 'investigating',
          message: 'Our automated monitors detected an elevated response time (120ms) for Tokyo edge PoPs. Anycast traffic is being shifted to Osaka (KIX).',
        },
      ],
    },
  ],
};
