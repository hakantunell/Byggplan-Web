const API_ORIGIN = 'https://api.byggplan.tunell.org';

async function proxyApi(request, routeOverride) {
  const incomingUrl = new URL(request.url);
  const route = routeOverride || incomingUrl.pathname;
  const targetUrl = new URL(route, API_ORIGIN);

  const forwardedSearch = new URLSearchParams(incomingUrl.searchParams);
  forwardedSearch.delete('__bp_route');
  targetUrl.search = forwardedSearch.toString();

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const method = request.method;
  const hasBody = !['GET', 'HEAD'].includes(method);
  let body;
  if (hasBody) {
    const contentType = request.headers.get('content-type') || '';
    body = contentType.toLowerCase().startsWith('multipart/form-data')
      ? await request.arrayBuffer()
      : request.body;
  }

  const upstream = await fetch(new Request(targetUrl.toString(), {
    method,
    headers,
    body,
    redirect: 'manual'
  }));

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('access-control-allow-origin');
  responseHeaders.delete('access-control-allow-credentials');
  responseHeaders.set('cache-control', 'no-store');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const routeOverride = url.searchParams.get('__bp_route');

    if (routeOverride) {
      if (!routeOverride.startsWith('/api/')) {
        return Response.json({ ok: false, error: 'Ogiltig API-route.' }, { status: 400 });
      }
      return proxyApi(request, routeOverride);
    }

    if (url.pathname.startsWith('/api/')) {
      return proxyApi(request);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== 'GET') return response;

    const accept = request.headers.get('accept') || '';
    if (!accept.includes('text/html')) return response;

    const indexUrl = new URL('/index.html', url);
    return env.ASSETS.fetch(new Request(indexUrl, request));
  }
};
