import type { Env } from './env';

export { MonitorHub } from './monitor-hub';

/** All state lives in one hub instance, so the name is fixed. */
const HUB_NAME = 'flare-status-hub';

/**
 * Public, unauthenticated reads. Serving these from the edge cache keeps routine
 * page views and README badge impressions from waking the Durable Object.
 */
function isPublicRead(request: Request, pathname: string): boolean {
  if (request.method !== 'GET') return false;
  return pathname === '/api/status' || pathname === '/metrics' || pathname.startsWith('/api/badge/');
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname === '/metrics';
}

function hub(env: Env) {
  return env.MONITOR_HUB.get(env.MONITOR_HUB.idFromName(HUB_NAME));
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(hub(env).runProbes());
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (!isApiRoute(pathname)) {
      return env.ASSETS
        ? env.ASSETS.fetch(request)
        : new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          });
    }

    if (!isPublicRead(request, pathname)) return hub(env).fetch(request);

    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await hub(env).fetch(request);
    if (response.ok) ctx.waitUntil(cache.put(request, response.clone()));
    return response;
  },
};
