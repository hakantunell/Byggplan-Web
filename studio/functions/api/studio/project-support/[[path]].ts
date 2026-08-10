const API_ORIGIN = 'https://api.byggplan.tunell.org';

type PagesContext = {
  request: Request;
  params: { path?: string | string[] };
};

function resourceId(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value.join('/') : (value || '');
  return path.split('/').filter(Boolean)[0] || '';
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const incomingUrl = new URL(context.request.url);
  const id = resourceId(context.params.path);
  if (!id) return new Response(JSON.stringify({ ok:false, error:'Underlag saknas.' }), { status:400, headers:{'Content-Type':'application/json'} });

  const headers = new Headers(context.request.headers);
  headers.delete('host');
  headers.delete('content-length');

  let bodyBytes: ArrayBuffer | undefined;
  let attachmentRequest = false;
  if (!['GET','HEAD'].includes(context.request.method)) {
    bodyBytes = await context.request.arrayBuffer();
    const contentType = context.request.headers.get('content-type') || '';
    if (contentType.includes('application/json') && bodyBytes.byteLength) {
      try {
        const text = new TextDecoder().decode(bodyBytes);
        const json = JSON.parse(text) as { operation?: string };
        attachmentRequest = json.operation === 'addAttachment';
      } catch {}
    }
  }

  const targetPath = attachmentRequest
    ? `/api/u/${encodeURIComponent(id)}`
    : `/api/studio/project-support/${encodeURIComponent(id)}`;
  const targetUrl = new URL(targetPath, API_ORIGIN);
  targetUrl.search = incomingUrl.search;

  let outgoingBody = bodyBytes;
  if (attachmentRequest && bodyBytes) {
    const text = new TextDecoder().decode(bodyBytes);
    const json = JSON.parse(text) as Record<string, unknown>;
    delete json.operation;
    outgoingBody = new TextEncoder().encode(JSON.stringify(json)).buffer;
  }

  const upstream = await fetch(new Request(targetUrl.toString(), {
    method: attachmentRequest ? 'POST' : context.request.method,
    headers,
    body: ['GET','HEAD'].includes(context.request.method) ? undefined : outgoingBody,
    redirect:'manual'
  }));

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('access-control-allow-origin');
  responseHeaders.delete('access-control-allow-credentials');
  return new Response(upstream.body, { status:upstream.status, statusText:upstream.statusText, headers:responseHeaders });
}
