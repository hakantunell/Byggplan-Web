const API_ORIGIN = 'https://api.byggplan.tunell.org';

type PagesContext = { request: Request; params: { id?: string } };

export async function onRequest(context: PagesContext): Promise<Response> {
  const id = context.params.id || '';
  if (!id) return new Response(JSON.stringify({ok:false,error:'Underlag saknas.'}),{status:400,headers:{'Content-Type':'application/json'}});

  const headers = new Headers(context.request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const method = context.request.method;
  const incomingBody = ['GET','HEAD'].includes(method) ? undefined : await context.request.arrayBuffer();
  let attachmentRequest = false;
  let outgoingBody = incomingBody;

  if (incomingBody && (context.request.headers.get('content-type') || '').includes('application/json')) {
    try {
      const json = JSON.parse(new TextDecoder().decode(incomingBody)) as Record<string,unknown>;
      attachmentRequest = json.operation === 'addAttachment';
      if (attachmentRequest) {
        delete json.operation;
        outgoingBody = new TextEncoder().encode(JSON.stringify(json)).buffer;
      }
    } catch {}
  }

  const targetUrl = new URL(attachmentRequest ? `/api/u/${encodeURIComponent(id)}` : `/api/studio/project-support/${encodeURIComponent(id)}`, API_ORIGIN);
  const upstream = await fetch(new Request(targetUrl.toString(), {
    method: attachmentRequest ? 'POST' : method,
    headers,
    body: ['GET','HEAD'].includes(method) ? undefined : outgoingBody,
    redirect:'manual'
  }));

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('access-control-allow-origin');
  responseHeaders.delete('access-control-allow-credentials');
  return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers:responseHeaders});
}
