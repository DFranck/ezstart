// apps/asc-tcd/web/middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Health check endpoint — returns 200 immediately for monitoring
  if (pathname === '/health') {
    return new NextResponse('OK', { status: 200 })
  }

  // asc-tcd is French-only. Redirect any /en or /en/* request to the
  // equivalent /fr path so legacy links or crawlers don't hit a 404.
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const frPath = pathname === '/en' ? '/fr' : `/fr${pathname.slice(3)}`
    const target = new URL(frPath + search, request.url)
    return NextResponse.redirect(target, 308)
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
