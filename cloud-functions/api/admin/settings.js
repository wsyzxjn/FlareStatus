import { getBlobStore, corsHeaders } from '../../_shared.js';

export async function onRequestPost(context) {
  const body = await context.request.json();
  const store = getBlobStore();
  if (store) {
    await store.setJSON('config/settings', body);
  }
  return new Response(JSON.stringify({ success: true }), {
    headers: corsHeaders,
  });
}
