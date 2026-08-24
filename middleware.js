// =========================================================================
// FlareStatus — EdgeOne Pages Edge Middleware
// Proxies /api/* and /metrics to the Cloudflare KV & Probe Backend
// =========================================================================

export const config = {
  matcher: ['/api/:path*', '/metrics'],
};

export async function middleware(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = `https://status.amatsuka.net${url.pathname}${url.search}`;

  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set('Host', 'status.amatsuka.net');

  try {
    const isBodyMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    const body = isBodyMethod ? await request.arrayBuffer() : undefined;

    const res = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body,
    });

    const responseHeaders = new Headers(res.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Backend proxy failed', message: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
