/**
 * Not a GoF Adapter in the same sense as GeminiAdapter/OpenAIAdapter --
 * there's only one way to make an HTTP request, nothing to swap. This
 * exists purely for the OTHER thing "isolate external APIs" means:
 * raw fetch() calls and their error handling live in ONE place instead
 * of being duplicated inside every strategy that happens to need HTTP.
 */
async function request(url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      'User-Agent': 'FlowEngine',
      ...headers,
    },
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}: ${typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300)}`);
  }

  return { status: res.status, data };
}

module.exports = { request };
