import {
  getBlobStore,
  DEFAULT_CATEGORIES,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_SETTINGS,
  corsHeaders,
} from '../../_shared.js';

export async function onRequestPost(context) {
  let scope = 'all';
  try {
    const body = await context.request.json();
    if (body?.scope) scope = body.scope;
  } catch (_e) {}

  const store = getBlobStore();
  if (store) {
    if (scope === 'all') {
      try {
        await store.delete('config/services');
        await store.delete('config/categories');
        await store.delete('config/incidents');
        await store.delete('config/notifications');
        await store.delete('config/settings');
        await store.delete('state/latest_probe_results');
      } catch (_e) {}
    } else if (scope === 'services') {
      await store.delete('config/services');
      await store.delete('state/latest_probe_results');
    } else if (scope === 'incidents') {
      await store.delete('config/incidents');
    } else if (scope === 'notifications') {
      await store.delete('config/notifications');
    }
  }

  return new Response(JSON.stringify({ success: true, scope, message: 'Data cleared successfully' }), {
    headers: corsHeaders,
  });
}
