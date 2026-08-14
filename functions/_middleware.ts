const API_ORIGIN = 'https://api.byggplan.tunell.org';

type PagesContext = {
  request: Request;
  next: () => Promise<Response>;
};

export async function onRequest(context: PagesContext): Promise<Response> {
  const incomingUrl = new URL(context.request.url);
  const route = incomingUrl.searchParams.get('__bp_route');
  if (!route) return context.next();

  if (!route.startsWith('/api/')) {
    return new Response(JSON.stringify({ ok: false, error: 'Ogiltig API-route.' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  const targetUrl = new URL(route, API_ORIGIN);
  const forwardedSearch = new URLSearchParams(incomingUrl.searchParams);
  forwardedSearch.delete('__bp_route');
  targetUrl.search = forwardedSearch.toString();

  const headers = new Headers(context.request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const method = context.request.method;
  const hasBody = !['GET', 'HEAD'].includes(method);
  const contentType = context.request.headers.get('content-type') || '';
  let body: BodyInit | undefined;
  if (hasBody) {
    body = contentType.toLowerCase().startsWith('multipart/form-data')
      ? await context.request.arrayBuffer()
      : context.request.body ?? undefined;
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
