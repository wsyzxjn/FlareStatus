import {
  getBlobStore,
  getStoredServices,
  corsHeaders,
} from '../../_shared.js';

export async function onRequest(context) {
  const token = (context.params?.token || '').trim();
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing push token' }), { status: 400, headers: corsHeaders });
  }

  const store = getBlobStore();
  const services = await getStoredServices(store);
  const target = services.find((s) => s.pushToken === token || (s.url && s.url.includes(token)));

  if (!target) {
    return new Response(JSON.stringify({ error: 'Push monitor token not found' }), { status: 404, headers: corsHeaders });
  }

  target.lastHeartbeatPing = new Date().toISOString();
  if (store) {
    await store.setJSON('config/services', services);
  }

  return new Response(JSON.stringify({ ok: true, token, receivedAt: target.lastHeartbeatPing }), { headers: corsHeaders });
}
