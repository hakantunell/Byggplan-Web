const nativeFetch = window.fetch.bind(window);

function resolveMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

function rewriteApiUrl(value: string, method: string): string {
  try {
    const url = new URL(value, window.location.origin);
    const isApiHost = url.hostname === 'api.byggplan.tunell.org';
    const isStudioHost = url.origin === window.location.origin;
    if (!url.pathname.startsWith('/api/') || (!isApiHost && !isStudioHost)) return value;

    // All read-only Studio API calls use one browser-visible route. This avoids
    // fragile/special URL paths in restrictive networks while keeping the real
    // backend route server-side in the Pages proxy.
    if (method === 'GET' && url.pathname !== '/api/studio/structure') {
      const relay = new URL('/api/studio/structure', window.location.origin);
      relay.searchParams.set('__relay', url.pathname);
      url.searchParams.forEach((entryValue, key) => relay.searchParams.append(key, entryValue));
      return relay.toString();
    }

    if (isApiHost) return `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
    return url.toString();
  } catch {
    return value;
  }
}

window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const method = resolveMethod(input, init);
  if (typeof input === 'string') {
    return nativeFetch(rewriteApiUrl(input, method), init);
  }

  if (input instanceof URL) {
    return nativeFetch(new URL(rewriteApiUrl(input.toString(), method)), init);
  }

  const rewritten = rewriteApiUrl(input.url, method);
  if (rewritten !== input.url) {
    return nativeFetch(new Request(rewritten, input), init);
  }

  return nativeFetch(input, init);
}) as typeof window.fetch;
