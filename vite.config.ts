import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In-memory store for local Vite development preview
let localServices: any[] = [];
let localCategories: any[] = [
  {
    id: 'default',
    name: '默认分类 (Default)',
    shortName: '默认',
    description: '基础服务与生产 API 端点',
    icon: 'server',
  },
];
let localIncidents: any[] = [];
let localNotifications: any[] = [];
let localSettings: any = {
  siteTitle: 'FlareStatus',
  siteSubtitle: 'Real-time telemetry and edge health across all global locations',
  targetSla: 99.9,
  probeInterval: 2,
  historyRetentionDays: 30,
};

function localApiMockPlugin(): Plugin {
  return {
    name: 'local-api-mock',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/') && req.url !== '/metrics') {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (url.pathname === '/api/status' && req.method === 'GET') {
          const totalServices = localServices.length;
          const liveServices = localServices.map((s) => ({
            id: s.id,
            name: s.name,
            url: s.url,
            categoryId: s.categoryId,
            status: s.enabled ? 'operational' : 'maintenance',
            currentLatency: 24,
            uptime30d: 100,
            region: s.region || 'Global Anycast',
            description: s.description,
            monitorType: s.monitorType || 'http',
            history30d: [],
            latencyHistory24h: [],
            updatedAt: new Date().toISOString(),
          }));

          const responseData = {
            systemStatus: 'operational',
            headline: 'All Systems Operational',
            subtitle: 'Real-time telemetry and edge health across all global locations',
            lastUpdated: new Date().toISOString(),
            overallUptime90d: 100,
            avgLatencyMs: totalServices > 0 ? 24 : 0,
            totalProbesToday: 0,
            activeRegionsCount: totalServices > 0 ? 310 : 0,
            categories: localCategories.map((cat) => ({
              ...cat,
              services: liveServices.filter((s) => s.categoryId === cat.id),
            })),
            activeIncidents: localIncidents.filter((i) => i.status !== 'resolved'),
            pastIncidents: localIncidents.filter((i) => i.status === 'resolved'),
          };

          res.end(JSON.stringify(responseData));
          return;
        }

        if (url.pathname === '/api/admin/data' && req.method === 'GET') {
          res.end(
            JSON.stringify({
              userEmail: 'admin@localhost.dev',
              categories: localCategories,
              services: localServices,
              incidents: localIncidents,
              notifications: localNotifications,
              settings: localSettings,
            })
          );
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : null;
            if (url.pathname === '/api/admin/services' && req.method === 'POST') {
              localServices = parsed || [];
              res.end(JSON.stringify({ success: true, count: localServices.length }));
              return;
            }
            if (url.pathname === '/api/admin/categories' && req.method === 'POST') {
              localCategories = parsed || [];
              res.end(JSON.stringify({ success: true, count: localCategories.length }));
              return;
            }
            if (url.pathname === '/api/admin/incidents' && req.method === 'POST') {
              localIncidents = parsed || [];
              res.end(JSON.stringify({ success: true, count: localIncidents.length }));
              return;
            }
            if (url.pathname === '/api/admin/notifications' && req.method === 'POST') {
              localNotifications = parsed || [];
              res.end(JSON.stringify({ success: true, count: localNotifications.length }));
              return;
            }
            if (url.pathname === '/api/admin/settings' && req.method === 'POST') {
              localSettings = parsed || localSettings;
              res.end(JSON.stringify({ success: true }));
              return;
            }
            if (url.pathname === '/api/admin/clear-data' && req.method === 'POST') {
              const scope = parsed?.scope || 'all';
              if (scope === 'all') {
                localServices = [];
                localIncidents = [];
                localNotifications = [];
                localCategories = [
                  {
                    id: 'default',
                    name: '默认分类 (Default)',
                    shortName: '默认',
                    description: '基础服务与生产 API 端点',
                    icon: 'server',
                  },
                ];
              } else if (scope === 'services') {
                localServices = [];
              } else if (scope === 'incidents') {
                localIncidents = [];
              } else if (scope === 'notifications') {
                localNotifications = [];
              }
              res.end(JSON.stringify({ success: true, message: 'Local data cleared' }));
              return;
            }
            if (url.pathname === '/api/admin/test-probe') {
              res.end(JSON.stringify({ status: 'operational', latency: 18, statusCode: 200 }));
              return;
            }
          } catch (_e) {}

          res.end(JSON.stringify({ success: true }));
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localApiMockPlugin(),
  ],
  server: {
    port: 3000,
    host: true,
  },
});
