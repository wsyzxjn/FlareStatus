import {
  getBlobStore,
  getStoredServices,
  getStoredCategories,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_SETTINGS,
  corsHeaders,
} from '../../_shared.js';

export async function onRequestGet() {
  const store = getBlobStore();
  const services = await getStoredServices(store);
  const categories = await getStoredCategories(store);

  let incidents = [];
  let notifications = DEFAULT_NOTIFICATIONS;
  let settings = DEFAULT_SETTINGS;

  if (store) {
    try {
      const rawInc = await store.get('config/incidents', { type: 'json' });
      if (rawInc && Array.isArray(rawInc)) incidents = rawInc;
      const rawNotif = await store.get('config/notifications', { type: 'json' });
      if (rawNotif && Array.isArray(rawNotif)) notifications = rawNotif;
      const rawSet = await store.get('config/settings', { type: 'json' });
      if (rawSet) settings = rawSet;
    } catch (_e) {}
  }

  return new Response(
    JSON.stringify({
      userEmail: 'admin@edgeone.internal',
      categories,
      services,
      incidents,
      notifications,
      settings,
    }),
    { headers: corsHeaders }
  );
}
