const API_ORIGIN = 'https://api.byggplan.tunell.org';

type PagesContext = {
  request: Request;
  params: { path?: string | string[] };
};

export async function onRequest(context: PagesContext): Promise<Response> {
  const pathValue = context.params.path;
  const path = Array.isArray(pathValue) ? pathValue.join('/') : (pathValue || '');
  const incomingUrl = new URL(context.request.url);

  let targetPath = `/api/${path}`;
  if (path === 'studio/structure') {
    const relay = incomingUrl.searchParams.get('__relay');
    if (relay?.startsWith('/api/')) targetPath = relay;
  }

  const targetUrl = new URL(targetPath, API_ORIGIN);
  const forwardedSearch = new URLSearchParams(incomingUrl.searchParams);
  forwardedSearch.delete('__relay');
  targetUrl.search = forwardedSearch.toString();

  const headers = new Headers(context.request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const method = context.request.method;
  const hasBody = !['GET', 'HEAD'].includes(method);
  const contentType = context.request.headers.get('content-type') || '';

  let body: BodyInit | undefined;
  if (hasBody) {
    if (contentType.toLowerCase().startsWith('multipart/form-data')) {
      body = await context.request.arrayBuffer();
    } else {
      body = context.request.body ?? undefined;
    }
  }

  const upstreamRequest = new Request(targetUrl.toString(), {
    method,
    headers,
    body,
    redirect: 'manual'
  });

  const upstream = await fetch(upstreamRequest);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('access-control-allow-origin');
  responseHeaders.delete('access-control-allow-credentials');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}
