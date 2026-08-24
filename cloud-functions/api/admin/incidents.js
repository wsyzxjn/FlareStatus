import { getBlobStore, corsHeaders } from '../../_shared.js';

export async function onRequestPost(context) {
  const body = await context.request.json();
  const store = getBlobStore();
  if (store) {
    await store.setJSON('config/incidents', body);
  }
  return new Response(JSON.stringify({ success: true, count: Array.isArray(body) ? body.length : 0 }), {
    headers: corsHeaders,
  });
}
