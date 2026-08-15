const nativeFetch = window.fetch.bind(window);

const DIRECT_API_ORIGIN = 'https://api.byggplan.tunell.org';

type ApiTargets = { root: string; sameOrigin: string; original: string; directFirst: boolean } | null;

function apiTargets(value: string): ApiTargets {
  try {
    const url = new URL(value, window.location.origin);
    const isApiHost = url.hostname === 'api.byggplan.tunell.org';
    const isFieldHost = url.origin === window.location.origin;
    if (!url.pathname.startsWith('/api/') || (!isApiHost && !isFieldHost)) return null;

    const directFirst = /^\/api\/project-document-(annotations(?:\/|$)|annotation-photos(?:\/|$))/.test(url.pathname);

    const root = new URL('/', window.location.origin);
    root.searchParams.set('__bp_route', url.pathname);
    url.searchParams.forEach((entryValue, key) => root.searchParams.append(key, entryValue));

    const sameOrigin = new URL(url.pathname, window.location.origin);
    sameOrigin.search = url.search;

    const original = directFirst
      ? (() => { const direct = new URL(url.pathname, DIRECT_API_ORIGIN); direct.search = url.search; return direct.toString(); })()
      : url.toString();

    return { root: root.toString(), sameOrigin: sameOrigin.toString(), original, directFirst };
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

  // Drawing annotations deliberately bypass the Pages transport. The field host currently
  // serves SPA HTML for /api/* instead of executing Pages Functions, while the API worker
  // already exposes CORS for byggplan.tunell.org.
  if (targets.directFirst) return nativeFetch(targets.original, init);

  // 1. Studio-style root transport. This is the preferred path on restrictive networks.
  try {
    const response = await nativeFetch(targets.root, init);
    if (!looksLikeHtml(response)) return response;
  } catch {}

  // 2. Existing same-origin Pages API proxy. This restores normal Field app operation
  // even if the root transport is not active in a particular Pages deployment.
  try {
    const response = await nativeFetch(targets.sameOrigin, init);
    if (!looksLikeHtml(response)) return response;
  } catch {}

  // 3. Last-resort direct API call, matching the Field app's original behaviour.
  return nativeFetch(targets.original, init);
}

window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string') return fetchWithFieldTransport(input, init);
  if (input instanceof URL) return fetchWithFieldTransport(input.toString(), init);

  const targets = apiTargets(input.url);
  if (!targets) return nativeFetch(input, init);

  const tryRequest = async (url: string, source: Request) => nativeFetch(new Request(url, source.clone()), init);

  if (targets.directFirst) return tryRequest(targets.original, input);

  // Request bodies are one-shot streams. Clone once for each transport attempt.
  return (async () => {
    try {
      const response = await tryRequest(targets.root, input);
      if (!looksLikeHtml(response)) return response;
    } catch {}
    try {
      const response = await tryRequest(targets.sameOrigin, input);
      if (!looksLikeHtml(response)) return response;
    } catch {}
    return tryRequest(targets.original, input);
  })();
}) as typeof window.fetch;
