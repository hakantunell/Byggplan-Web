const nativeFetch = window.fetch.bind(window);

function rewriteApiUrl(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    const isApiHost = url.hostname === 'api.byggplan.tunell.org';
    const isFieldHost = url.origin === window.location.origin;
    if (!url.pathname.startsWith('/api/') || (!isApiHost && !isFieldHost)) return value;

    // Keep browser-visible API traffic on the site root. The Pages middleware
    // translates __bp_route server-side before forwarding to the API worker.
    const transport = new URL('/', window.location.origin);
    transport.searchParams.set('__bp_route', url.pathname);
    url.searchParams.forEach((entryValue, key) => transport.searchParams.append(key, entryValue));
    return transport.toString();
  } catch {
    return value;
  }
}

window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string') return nativeFetch(rewriteApiUrl(input), init);
  if (input instanceof URL) return nativeFetch(new URL(rewriteApiUrl(input.toString())), init);

  const rewritten = rewriteApiUrl(input.url);
  if (rewritten !== input.url) return nativeFetch(new Request(rewritten, input), init);
  return nativeFetch(input, init);
}) as typeof window.fetch;
