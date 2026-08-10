const API_ORIGIN = 'https://api.byggplan.tunell.org';

type PagesContext = {
  request: Request;
  params: { path?: string | string[] };
};

export async function onRequest(context: PagesContext): Promise<Response> {
  const pathValue = context.params.path;
  const path = Array.isArray(pathValue) ? pathValue.join('/') : (pathValue || '');
  const incomingUrl = new URL(context.request.url);
  const targetUrl = new URL(`/api/${path}`, API_ORIGIN);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(context.request.headers);
  headers.delete('host');

  const upstreamRequest = new Request(targetUrl.toString(), {
    method: context.request.method,
    headers,
    body: ['GET', 'HEAD'].includes(context.request.method) ? undefined : context.request.body,
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
