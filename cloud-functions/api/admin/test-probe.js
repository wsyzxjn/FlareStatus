import { probeEndpoint, corsHeaders } from '../../_shared.js';

export async function onRequestPost(context) {
  const body = await context.request.json();
  const probeResult = await probeEndpoint({
    id: 'test',
    name: 'Test Probe',
    categoryId: 'test',
    url: body.url,
    enabled: true,
    method: body.method || 'GET',
    timeout: body.timeout || 5,
  });
  return new Response(JSON.stringify(probeResult), { headers: corsHeaders });
}
