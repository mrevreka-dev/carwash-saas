import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing, locales } from './i18n/routing';
import { verifySessionToken, SESSION_COOKIE } from './lib/session';

const intlMiddleware = createIntlMiddleware(routing);

// Path segments (after the locale prefix) that require an authenticated user.
const PROTECTED_PREFIXES = ['/dashboard'];
// Public segments that authenticated users should be bounced away from.
const AUTH_PAGES = ['/login'];

function stripLocale(pathname: string): string {
  const segments = pathname.split('/');
  if (segments.length > 1 && (locales as readonly string[]).includes(segments[1])) {
    return '/' + segments.slice(2).join('/');
  }
  return pathname;
}

function localeOf(pathname: string): string {
  const seg = pathname.split('/')[1];
  return (locales as readonly string[]).includes(seg) ? seg : routing.defaultLocale;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let API + booking routes pass through the intl handling but skip guards.
  const response = intlMiddleware(req);

  const pathNoLocale = stripLocale(pathname);
  const locale = localeOf(pathname);

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token).catch(() => null) : null;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathNoLocale === p || pathNoLocale.startsWith(p + '/')
  );
  const isAuthPage = AUTH_PAGES.some((p) => pathNoLocale === p);

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && session) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Match everything except Next internals and static files.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
