const nativeFetch = window.fetch.bind(window);

type ApiTargets = { root: string; sameOrigin: string; original: string } | null;

function apiTargets(value: string): ApiTargets {
  try {
    const url = new URL(value, window.location.origin);
    const isApiHost = url.hostname === 'api.byggplan.tunell.org';
    const isFieldHost = url.origin === window.location.origin;
    if (!url.pathname.startsWith('/api/') || (!isApiHost && !isFieldHost)) return null;

    const root = new URL('/', window.location.origin);
    root.searchParams.set('__bp_route', url.pathname);
    url.searchParams.forEach((entryValue, key) => root.searchParams.append(key, entryValue));

    const sameOrigin = new URL(url.pathname, window.location.origin);
    sameOrigin.search = url.search;

    return { root: root.toString(), sameOrigin: sameOrigin.toString(), original: url.toString() };
  } catch {
    return null;
  }
}

function looksLikeHtml(response: Response) {
  return (response.headers.get('content-type') || '').toLowerCase().includes('text/html');
}

async function fetchWithFieldTransport(value: string, init?: RequestInit): Promise<Response> {
  const targets = apiTargets(value);
  if (!targets) return nativeFetch(value, init);

  // 1. Same-origin /api transport handled by the deployed byggplan-web Worker.
  // This supports PUT/POST and multipart uploads without browser CORS/preflight issues.
  try {
    const response = await nativeFetch(targets.sameOrigin, init);
    if (!looksLikeHtml(response)) return response;
  } catch {}

  // 2. Backward-compatible root transport for older deployments.
  try {
    const response = await nativeFetch(targets.root, init);
    if (!looksLikeHtml(response)) return response;
  } catch {}

  // 3. Last-resort direct API call.
  return nativeFetch(targets.original, init);
}

window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string') return fetchWithFieldTransport(input, init);
  if (input instanceof URL) return fetchWithFieldTransport(input.toString(), init);

  const targets = apiTargets(input.url);
  if (!targets) return nativeFetch(input, init);

  const tryRequest = async (url: string, source: Request) => nativeFetch(new Request(url, source.clone()), init);

  return (async () => {
    try {
      const response = await tryRequest(targets.sameOrigin, input);
      if (!looksLikeHtml(response)) return response;
    } catch {}
    try {
      const response = await tryRequest(targets.root, input);
      if (!looksLikeHtml(response)) return response;
    } catch {}
    return tryRequest(targets.original, input);
  })();
}) as typeof window.fetch;
