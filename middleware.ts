/**
 * Next.js middleware — refreshes Supabase auth session on every request
 * and protects /(app) routes. Unauthenticated users are redirected to
 * /login; logged-in users hitting /(auth) are redirected to /dashboard.
 *
 * @module middleware
 */
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];
const PROTECTED_PREFIXES = ['/dashboard', '/team', '/api-keys', '/audit', '/billing', '/settings', '/onboarding', '/api/org', '/api/team', '/api/api-keys', '/api/billing', '/api/audit'];
const PUBLIC_API_PREFIXES = ['/api/v1', '/api/billing/webhook'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public API + webhook routes through (they do their own auth).
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Refresh session cookies on the response.
  const res = NextResponse.next({
    request: { headers: req.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key',
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
