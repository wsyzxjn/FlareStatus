import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

const DAY_MS = 86_400_000;
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_CATEGORIES = [{
  id: 'default',
  name: '默认分类 (Default)',
  shortName: '默认',
  description: '基础服务与生产 API 端点',
  icon: 'server',
}];

const DEFAULT_SETTINGS = {
  siteTitle: 'FlareStatus',
  siteSubtitle: 'Scheduled edge telemetry and service health',
  targetSla: 99.9,
  probeInterval: 2,
  historyRetentionDays: 90,
};

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...jsonHeaders, ...headers } });
}

function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return toBase64URL(value);
}

function toBase64URL(value) {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64URL(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toBase64URL(new Uint8Array(digest));
}

async function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const [leftHash, rightHash] = await Promise.all([sha256(left), sha256(right)]);
  let difference = leftHash.length ^ rightHash.length;
  for (let index = 0; index < Math.max(leftHash.length, rightHash.length); index += 1) {
    difference |= (leftHash.charCodeAt(index) || 0) ^ (rightHash.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function parseCookie(request, name) {
  const cookies = request.headers.get('Cookie') || '';
  for (const item of cookies.split(';')) {
    const [key, ...parts] = item.trim().split('=');
    if (key === name) return decodeURIComponent(parts.join('='));
  }
  return null;
}

function sessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return `flare_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

async function readJSON(storage, key, fallback) {
  const value = await storage.get(key);
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
}

async function writeJSON(storage, key, value) {
  await storage.put(key, JSON.stringify(value));
}

function normalizeCreatedAt(service, now = new Date().toISOString()) {
  if (service.createdAt && Number.isFinite(Date.parse(service.createdAt))) return service.createdAt;
  const match = /^svc-(\d{13})$/.exec(service.id || '');
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return now;
}

async function loadServices(storage) {
  const services = await readJSON(storage, 'config:services', []);
  if (!Array.isArray(services)) return [];
  let changed = false;
  const normalized = services.map((service) => {
    const createdAt = normalizeCreatedAt(service);
    if (createdAt !== service.createdAt) changed = true;
    return { ...service, createdAt };
  });
  if (changed) await writeJSON(storage, 'config:services', normalized);
  return normalized;
}

function isAcceptedStatus(statusCode, pattern, fallback = 200) {
  if (!pattern) return statusCode === fallback;
  return pattern.split(',').some((raw) => {
    const part = raw.trim();
    if (/^\d{3}-\d{3}$/.test(part)) {
      const [start, end] = part.split('-').map(Number);
      return statusCode >= start && statusCode <= end;
    }
    return /^\d{3}$/.test(part) && Number(part) === statusCode;
  });
}

function validateTargetURL(rawURL) {
  let url;
  try { url = new URL(rawURL); } catch { throw new Error('Invalid target URL'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) targets are supported');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host.endsWith('.local')) {
    throw new Error('Local targets are not allowed');
  }
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) {
    throw new Error('Private network targets are not allowed');
  }
  const match172 = /^172\.(\d+)\./.exec(host);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) {
    throw new Error('Private network targets are not allowed');
  }
  return url.toString();
}

async function probeEndpoint(service) {
  if (service.monitorType === 'push') {
    const lastPing = service.lastHeartbeatPing ? Date.parse(service.lastHeartbeatPing) : 0;
    const intervalMs = Math.max(1, Number(service.heartbeatInterval) || 60) * 60 * 1000;
    const isAlive = lastPing > 0 && Date.now() - lastPing <= intervalMs;
    return { status: isAlive ? 'operational' : 'outage', latency: 0, statusCode: isAlive ? 200 : 504 };
  }

  const target = validateTargetURL(service.url);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(1, Number(service.timeout) || 8) * 1000);
  try {
    const headers = { 'User-Agent': 'FlareStatusProber/2.0' };
    for (const line of (service.headers || '').split('\n')) {
      const index = line.indexOf(':');
      if (index > 0) headers[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    }
    if (service.authMethod === 'bearer' && service.bearerToken) headers.Authorization = `Bearer ${service.bearerToken}`;
    if (service.authMethod === 'basic' && service.basicUser) {
      headers.Authorization = `Basic ${btoa(`${service.basicUser}:${service.basicPass || ''}`)}`;
    }
    const method = service.method || 'GET';
    const response = await fetch(target, {
      method,
      headers,
      body: service.body && ['POST', 'PUT', 'PATCH'].includes(method) ? service.body : undefined,
      redirect: 'manual',
      signal: controller.signal,
    });
    const latency = Date.now() - startedAt;
    let healthy = isAcceptedStatus(response.status, service.acceptedStatusCodes, service.expectedStatus || 200);
    if (service.monitorType === 'keyword' && service.keywordMatch) {
      healthy = healthy && (await response.text()).includes(service.keywordMatch);
    }
    if (service.upsideDown) healthy = !healthy;
    return {
      status: healthy ? (latency > 1500 ? 'degraded' : 'operational') : 'outage',
      latency,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      status: service.upsideDown ? 'operational' : 'outage',
      latency: Date.now() - startedAt,
      statusCode: 0,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function emptyMonitorState() {
  return { latest: null, recent: [], days: {} };
}

async function probeWithRetries(service) {
  const maxRetries = Math.min(5, Math.max(0, Number(service.maxRetries) || 0));
  let result;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    result = await probeEndpoint(service);
    if (result.status !== 'outage' || attempt === maxRetries) break;
    const retryDelay = Math.min(30, Math.max(1, Number(service.retryInterval) || 1)) * 1000;
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }
  return result;
}

export async function runScheduled(storage, telemetry) {
  const services = await loadServices(storage);
  const enabled = services.filter((service) => service.enabled);
  // Zero services means zero work and, crucially, zero storage writes. The
  // previous implementation unconditionally stamped a bookkeeping key here,
  // which burned 720 KV writes/day (72% of the free tier) with no services
  // configured at all.
  if (!enabled.length) return 0;

  const heartbeats = await telemetry.getHeartbeats();
  const timestamp = new Date().toISOString();
  const entries = await Promise.all(
    enabled.map(async (service) => ({
      serviceId: service.id,
      sample: {
        ...(await probeWithRetries({
          ...service,
          lastHeartbeatPing: heartbeats[service.id] ?? service.lastHeartbeatPing,
        })),
        timestamp,
      },
    })),
  );
  await telemetry.recordBatch(entries);
  return enabled.length;
}

function buildHistory(state, createdAt, days = 90) {
  const result = [];
  const created = Date.parse(createdAt);
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * DAY_MS).toISOString().slice(0, 10);
    const dayStart = Date.parse(`${date}T00:00:00.000Z`);
    const aggregate = state.days?.[date];
    if (dayStart + DAY_MS <= created || !aggregate?.total) {
      result.push({ date, status: 'no_data', uptime: 0, avgLatency: 0, incidentsCount: 0 });
      continue;
    }
    result.push({
      date,
      status: aggregate.worst,
      uptime: Number(((aggregate.healthy / aggregate.total) * 100).toFixed(2)),
      avgLatency: Math.round(aggregate.latencyTotal / aggregate.total),
      incidentsCount: aggregate.worst === 'outage' ? 1 : 0,
    });
  }
  return result;
}

function calculateUptime(history) {
  const monitored = history.filter((day) => day.status !== 'no_data');
  if (!monitored.length) return 0;
  return Number((monitored.reduce((total, day) => total + day.uptime, 0) / monitored.length).toFixed(2));
}

function recentLatencies(state) {
  return (state.recent || []).map((sample) => ({
    time: new Date(sample.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    latency: Number(sample.latency) || 0,
    timestamp: sample.timestamp,
    status: sample.status,
  }));
}

function publicEndpointURL(service) {
  if (service.monitorType === 'push') return undefined;
  try {
    const target = new URL(service.url);
    return `${target.protocol}//${target.host}`;
  } catch {
    return undefined;
  }
}

function publicService(service, state) {
  const history90d = buildHistory(state, service.createdAt);
  const latest = state.latest;
  return {
    id: service.id,
    name: service.name,
    categoryId: service.categoryId,
    categoryName: service.categoryId,
    status: latest?.status || 'no_data',
    monitorType: service.monitorType || 'http',
    currentLatency: Number(latest?.latency) || 0,
    uptime90d: calculateUptime(history90d),
    lastChecked: latest?.timestamp || null,
    region: service.region || 'Global Anycast',
    endpointUrl: publicEndpointURL(service),
    description: service.description,
    createdAt: service.createdAt,
    recentLatencies: recentLatencies(state),
    history90d,
  };
}

function worstStatus(services, incidents) {
  if (incidents.some((incident) => incident.severity === 'critical')) return 'outage';
  if (services.some((service) => service.status === 'outage')) return 'outage';
  if (incidents.length || services.some((service) => ['degraded', 'maintenance'].includes(service.status))) return 'degraded';
  if (!services.length || services.every((service) => service.status === 'no_data')) return 'no_data';
  return 'operational';
}

function headlineFor(status) {
  return {
    operational: 'All Systems Operational',
    degraded: 'Some Systems Are Degraded',
    outage: 'Service Outage Detected',
    maintenance: 'Maintenance in Progress',
    no_data: 'Awaiting First Probe',
  }[status];
}

async function statusPayload(storage, telemetry) {
  const [services, categories, incidents] = await Promise.all([
    loadServices(storage),
    readJSON(storage, 'config:categories', DEFAULT_CATEGORIES),
    readJSON(storage, 'config:incidents', []),
  ]);
  const enabled = services.filter((service) => service.enabled);
  const stateMap = await telemetry.getStates(enabled.map((service) => service.id));
  const states = enabled.map((service) => stateMap.get(service.id) ?? emptyMonitorState());
  const liveServices = enabled.map((service, index) => publicService(service, states[index]));
  const today = new Date().toISOString().slice(0, 10);
  const totalProbesToday = states.reduce((sum, state) => sum + (Number(state.days?.[today]?.total) || 0), 0);
  const categoryMap = new Map((Array.isArray(categories) ? categories : DEFAULT_CATEGORIES).map((category) => [category.id, { ...category, services: [] }]));
  for (const service of liveServices) {
    if (!categoryMap.has(service.categoryId)) categoryMap.set(service.categoryId, { id: service.categoryId, name: service.categoryId, services: [] });
    categoryMap.get(service.categoryId).services.push(service);
  }
  const activeIncidents = (Array.isArray(incidents) ? incidents : []).filter((incident) => incident.status !== 'resolved');
  const pastIncidents = (Array.isArray(incidents) ? incidents : []).filter((incident) => incident.status === 'resolved');
  const systemStatus = worstStatus(liveServices, activeIncidents);
  const measured = liveServices.filter((service) => service.status !== 'no_data');
  return {
    systemStatus,
    headline: headlineFor(systemStatus),
    lastUpdated: new Date().toISOString(),
    overallUptime90d: measured.length ? Number((measured.reduce((sum, service) => sum + service.uptime90d, 0) / measured.length).toFixed(2)) : 0,
    avgLatencyMs: measured.length ? Math.round(measured.reduce((sum, service) => sum + service.currentLatency, 0) / measured.length) : 0,
    totalProbesToday,
    categories: [...categoryMap.values()].filter((category) => category.services.length),
    activeIncidents,
    pastIncidents,
  };
}

function escapeXML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}

function badgeSVG(name, status, uptime) {
  const label = escapeXML(name.length > 18 ? `${name.slice(0, 16)}..` : name);
  const healthy = status === 'operational';
  const value = escapeXML(healthy ? `up ${uptime}%` : status.replace('_', ' '));
  const color = healthy ? '#34c759' : status === 'outage' ? '#ff3b30' : '#ff9500';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="20" role="img" aria-label="${label}: ${value}"><title>${label}: ${value}</title><rect width="120" height="20" rx="4" fill="#2c2c2e"/><rect x="116" width="104" height="20" rx="4" fill="${color}"/><g fill="#fff" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11"><text x="60" y="14">${label}</text><text x="168" y="14">${value}</text></g></svg>`;
}

function escapeMetric(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

async function credentialsFor(storage, rpID) {
  const credentials = await readJSON(storage, 'auth:credentials', []);
  return (Array.isArray(credentials) ? credentials : []).filter((credential) => credential.rpID === rpID);
}

async function hasSession(request, storage) {
  const token = parseCookie(request, 'flare_session');
  if (!token) return false;
  const key = `auth:session:${await sha256(token)}`;
  const session = await readJSON(storage, key, null);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) await storage.delete(key);
    return false;
  }
  return true;
}

async function createSession(storage) {
  const token = randomToken();
  await writeJSON(storage, `auth:session:${await sha256(token)}`, { expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 });
  return token;
}

async function saveChallenge(storage, type, challenge, rpID, origin) {
  const id = randomToken(18);
  await writeJSON(storage, `auth:challenge:${id}`, { type, challenge, rpID, origin, expiresAt: Date.now() + CHALLENGE_TTL_MS });
  return id;
}

async function takeChallenge(storage, id, type) {
  const key = `auth:challenge:${id}`;
  const challenge = await readJSON(storage, key, null);
  await storage.delete(key);
  if (!challenge || challenge.type !== type || challenge.expiresAt <= Date.now()) throw new Error('Challenge expired');
  return challenge;
}

async function authRoute(request, storage, setupToken) {
  const url = new URL(request.url);
  const rpID = url.hostname;
  const origin = url.origin;
  const credentials = await credentialsFor(storage, rpID);
  const configured = credentials.length > 0;

  if (url.pathname === '/api/auth/session' && request.method === 'GET') {
    return json({ authenticated: await hasSession(request, storage), configured });
  }

  if (url.pathname === '/api/auth/register/options' && request.method === 'POST') {
    if (!configured && !setupToken) return json({ error: 'ADMIN_SETUP_TOKEN is not configured' }, 503);
    const authorized = configured
      ? await hasSession(request, storage)
      : await safeEqual(request.headers.get('X-Setup-Token'), setupToken);
    if (!authorized) return json({ error: configured ? 'Authentication required' : 'Invalid setup token' }, 401);
    const options = await generateRegistrationOptions({
      rpName: 'FlareStatus Admin',
      rpID,
      userName: 'admin',
      userDisplayName: 'FlareStatus Administrator',
      attestationType: 'none',
      excludeCredentials: credentials.map((credential) => ({ id: credential.id, transports: credential.transports })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    });
    const challengeId = await saveChallenge(storage, 'registration', options.challenge, rpID, origin);
    return json({ options, challengeId });
  }

  if (url.pathname === '/api/auth/register/verify' && request.method === 'POST') {
    const body = await request.json();
    const challenge = await takeChallenge(storage, body.challengeId, 'registration');
    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.origin,
      expectedRPID: challenge.rpID,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) return json({ error: 'Passkey verification failed' }, 400);
    const credential = verification.registrationInfo.credential;
    const allCredentials = await readJSON(storage, 'auth:credentials', []);
    const stored = {
      id: credential.id,
      publicKey: toBase64URL(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports,
      rpID: challenge.rpID,
      createdAt: new Date().toISOString(),
    };
    await writeJSON(storage, 'auth:credentials', [...allCredentials.filter((item) => item.id !== stored.id), stored]);
    const token = await createSession(storage);
    return json({ verified: true }, 200, { 'Set-Cookie': sessionCookie(token) });
  }

  if (url.pathname === '/api/auth/login/options' && request.method === 'POST') {
    if (!configured) return json({ error: 'No passkey has been registered' }, 409);
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map((credential) => ({ id: credential.id, transports: credential.transports })),
      userVerification: 'required',
    });
    const challengeId = await saveChallenge(storage, 'authentication', options.challenge, rpID, origin);
    return json({ options, challengeId });
  }

  if (url.pathname === '/api/auth/login/verify' && request.method === 'POST') {
    const body = await request.json();
    const challenge = await takeChallenge(storage, body.challengeId, 'authentication');
    const credential = (await credentialsFor(storage, challenge.rpID)).find((item) => item.id === body.response?.id);
    if (!credential) return json({ error: 'Unknown passkey' }, 400);
    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.origin,
      expectedRPID: challenge.rpID,
      credential: { id: credential.id, publicKey: fromBase64URL(credential.publicKey), counter: credential.counter, transports: credential.transports },
      requireUserVerification: true,
    });
    if (!verification.verified) return json({ error: 'Passkey verification failed' }, 401);
    const allCredentials = await readJSON(storage, 'auth:credentials', []);
    await writeJSON(storage, 'auth:credentials', allCredentials.map((item) => item.id === credential.id ? { ...item, counter: verification.authenticationInfo.newCounter } : item));
    const token = await createSession(storage);
    return json({ verified: true }, 200, { 'Set-Cookie': sessionCookie(token) });
  }

  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    const token = parseCookie(request, 'flare_session');
    if (token) await storage.delete(`auth:session:${await sha256(token)}`);
    return json({ success: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
  }

  return null;
}

async function adminRoute(request, storage, telemetry) {
  const url = new URL(request.url);
  if (!(await hasSession(request, storage))) return json({ error: 'Authentication required' }, 401);

  if (url.pathname === '/api/admin/data' && request.method === 'GET') {
    const [services, categories, incidents, notifications, settings] = await Promise.all([
      loadServices(storage),
      readJSON(storage, 'config:categories', DEFAULT_CATEGORIES),
      readJSON(storage, 'config:incidents', []),
      readJSON(storage, 'config:notifications', []),
      readJSON(storage, 'config:settings', DEFAULT_SETTINGS),
    ]);
    return json({ userEmail: 'Passkey administrator', services, categories, incidents, notifications, settings });
  }

  const saveRoutes = new Map([
    ['/api/admin/services', 'config:services'],
    ['/api/admin/categories', 'config:categories'],
    ['/api/admin/incidents', 'config:incidents'],
    ['/api/admin/notifications', 'config:notifications'],
    ['/api/admin/settings', 'config:settings'],
  ]);
  if (saveRoutes.has(url.pathname) && request.method === 'POST') {
    let body = await request.json();
    if (url.pathname !== '/api/admin/settings' && !Array.isArray(body)) return json({ error: 'Expected an array' }, 400);
    if (url.pathname === '/api/admin/services') body = body.map((service) => ({ ...service, createdAt: normalizeCreatedAt(service) }));
    await writeJSON(storage, saveRoutes.get(url.pathname), body);
    return json({ success: true, count: Array.isArray(body) ? body.length : undefined });
  }

  if ((url.pathname === '/api/admin/probe' || url.pathname === '/api/probe') && request.method === 'POST') {
    const count = await runScheduled(storage, telemetry);
    return json({ success: true, count });
  }

  if (url.pathname === '/api/admin/test-probe' && request.method === 'POST') {
    const body = await request.json();
    try {
      return json(await probeEndpoint({ id: 'test', name: 'Test', categoryId: 'test', enabled: true, ...body }));
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Probe failed' }, 400);
    }
  }

  if (url.pathname === '/api/admin/clear-data' && request.method === 'POST') {
    const body = await request.json().catch(() => ({ scope: 'all' }));
    const scope = body.scope || 'all';
    if (scope === 'all' || scope === 'services') {
      const services = await loadServices(storage);
      await telemetry.clear(services.map((service) => service.id));
      await writeJSON(storage, 'config:services', []);
    }
    if (scope === 'all') await writeJSON(storage, 'config:categories', DEFAULT_CATEGORIES);
    if (scope === 'all' || scope === 'incidents') await writeJSON(storage, 'config:incidents', []);
    if (scope === 'all' || scope === 'notifications') await writeJSON(storage, 'config:notifications', []);
    if (scope === 'all') await writeJSON(storage, 'config:settings', DEFAULT_SETTINGS);
    return json({ success: true, scope });
  }

  return json({ error: 'Not found' }, 404);
}

export function createApp({ storage, telemetry, setupToken }) {
  return async function handle(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: 'GET, POST, OPTIONS' } });

    try {
      if (url.pathname.startsWith('/api/auth/')) {
        const response = await authRoute(request, storage, setupToken);
        if (response) return response;
      }

      if (url.pathname.startsWith('/api/admin/') || url.pathname === '/api/probe') {
        return adminRoute(request, storage, telemetry);
      }

      if (url.pathname.startsWith('/api/push/') && ['GET', 'POST'].includes(request.method)) {
        const token = url.pathname.slice('/api/push/'.length);
        const services = await loadServices(storage);
        const service = services.find((item) => item.monitorType === 'push' && item.pushToken && item.pushToken === token);
        if (!service) return json({ error: 'Invalid push token' }, 404);
        const receivedAt = new Date().toISOString();
        // Heartbeats are stored on their own key rather than by rewriting the
        // shared service list, so concurrent check-ins cannot clobber each other.
        await telemetry.setHeartbeat(service.id, receivedAt);
        await telemetry.recordBatch([
          { serviceId: service.id, sample: { status: 'operational', latency: 0, statusCode: 200, timestamp: receivedAt } },
        ]);
        return json({ success: true, receivedAt });
      }

      if (url.pathname === '/api/status' && request.method === 'GET') {
        return json(await statusPayload(storage, telemetry), 200, { 'Cache-Control': 'public, max-age=15, s-maxage=15', 'Access-Control-Allow-Origin': '*' });
      }

      if (url.pathname.startsWith('/api/badge/') && request.method === 'GET') {
        const payload = await statusPayload(storage, telemetry);
        const id = url.pathname.slice('/api/badge/'.length);
        const services = payload.categories.flatMap((category) => category.services);
        const service = id === 'overall' || id === 'all' ? null : services.find((item) => item.id === id);
        const svg = badgeSVG(service?.name || 'System Status', service?.status || payload.systemStatus, service?.uptime90d ?? payload.overallUptime90d);
        // Badges get embedded in READMEs and proxied by image caches; `no-store`
        // turned every viewer into a full status recomputation.
        return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'", 'Cache-Control': 'public, max-age=60, s-maxage=60', 'Access-Control-Allow-Origin': '*' } });
      }

      if (url.pathname === '/metrics' && request.method === 'GET') {
        const payload = await statusPayload(storage, telemetry);
        const services = payload.categories.flatMap((category) => category.services);
        let output = '# HELP probe_success Whether the latest probe was successful\n# TYPE probe_success gauge\n';
        for (const service of services) {
          const labels = `service="${escapeMetric(service.id)}",name="${escapeMetric(service.name)}",category="${escapeMetric(service.categoryId)}"`;
          output += `probe_success{${labels}} ${service.status === 'operational' || service.status === 'degraded' ? 1 : 0}\n`;
          output += `probe_duration_seconds{service="${escapeMetric(service.id)}"} ${(service.currentLatency / 1000).toFixed(3)}\n`;
          output += `service_uptime_ratio{service="${escapeMetric(service.id)}"} ${(service.uptime90d / 100).toFixed(4)}\n`;
        }
        return new Response(output, { headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
      }

      if (url.pathname === '/api/cron-probe' && request.method === 'POST') {
        // Derived from stored samples, so debouncing costs no extra write.
        const lastRun = Date.parse((await telemetry.lastRun()) || '');
        if (Number.isFinite(lastRun) && Date.now() - lastRun < 60_000) return json({ success: true, skipped: true });
        return json({ success: true, count: await runScheduled(storage, telemetry) });
      }

      return json({ error: 'Not found' }, 404);
    } catch (error) {
      console.error('[FlareStatus]', error);
      return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
    }
  };
}

export const testables = { buildHistory, calculateUptime, normalizeCreatedAt, validateTargetURL, worstStatus };
