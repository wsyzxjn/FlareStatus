import {
  getBlobStore,
  getStoredServices,
  generateSvgBadge,
} from '../../_shared.js';

export async function onRequestGet(context) {
  const badgeId = (context.params?.id || 'overall').trim();
  const store = getBlobStore();
  const services = await getStoredServices(store);

  let serviceName = 'System';
  let isHealthy = true;
  let uptime = '100%';

  if (badgeId !== 'overall') {
    const matched = services.find((s) => s.id === badgeId);
    if (matched) {
      serviceName = matched.name;
      isHealthy = matched.enabled;
      uptime = '100%';
    }
  }

  const svg = generateSvgBadge(serviceName, isHealthy, uptime);
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml;charset=utf-8',
      'Cache-Control': 'max-age=60, s-maxage=60',
    },
  });
}
