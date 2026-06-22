/**
 * CSRF protection for mutating Route Handlers.
 *
 * SameSite=Lax auth cookies block cross-site POSTs in modern browsers, but
 * we additionally require a custom header that browsers will not send in a
 * cross-site form submission. Fetch/XHR from our own client sets this header.
 *
 * @module lib/security/csrf
 */
import { NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function checkCsrf(req: Request): NextResponse | null {
  if (SAFE_METHODS.has(req.method)) return null;
  const header = req.headers.get('x-requested-with');
  if (header === 'XMLHttpRequest') return null;
  return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 });
}
