/**
 * Browser API helper.
 *
 * All mutating app routes require the `x-requested-with: XMLHttpRequest`
 * header as a CSRF defense. Centralising the fetch wrapper prevents individual
 * components from forgetting it (which previously broke AI and billing).
 *
 * @module lib/api/client
 */

export type ApiFetchOptions = RequestInit & {
  /** JSON body convenience. Mutually exclusive with `body`. */
  json?: unknown;
};

/**
 * Fetch wrapper that sets the CSRF header and serialises JSON bodies.
 *
 * FormData bodies are passed through untouched so the browser can set the
 * multipart boundary.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: ApiFetchOptions = {},
): Promise<Response> {
  const { json, body, headers: rawHeaders, ...rest } = init;
  const headers = new Headers(rawHeaders);

  if (!headers.has('x-requested-with')) {
    headers.set('x-requested-with', 'XMLHttpRequest');
  }

  let requestBody = body;
  if (json !== undefined) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    requestBody = JSON.stringify(json);
  } else if (
    requestBody &&
    !(requestBody instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(input, {
    ...rest,
    body: requestBody,
    headers,
  });
}
