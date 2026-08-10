const nativeFetch = window.fetch.bind(window);

function rewriteApiUrl(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    if (url.hostname === 'api.byggplan.tunell.org' && url.pathname.startsWith('/api/')) {
      return `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
    }
    return value;
  } catch {
    return value;
  }
}

window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string') {
    return nativeFetch(rewriteApiUrl(input), init);
  }

  if (input instanceof URL) {
    return nativeFetch(new URL(rewriteApiUrl(input.toString())), init);
  }

  const rewritten = rewriteApiUrl(input.url);
  if (rewritten !== input.url) {
    return nativeFetch(new Request(rewritten, input), init);
  }

  return nativeFetch(input, init);
}) as typeof window.fetch;
