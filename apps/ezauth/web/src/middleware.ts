// apps/ezauth/web/src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/** Allowed app values for legacy `?app=` theme scoping */
const VALID_APPS = new Set(['ezauth', 'ezstart', 'ezbill', 'ezpay', 'green-pulse', 'fengshui'])

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  // Health check endpoint — returns 200 immediately for monitoring
  if (request.nextUrl.pathname === '/health') {
    return new NextResponse('OK', { status: 200 })
  }

  // Resolve app theme from URL params.
  // ?key= (publishable key) takes priority over ?app= (legacy).
  // Key resolution is handled client-side by the auth pages; middleware
  // only forwards the legacy ?app= for SSR theme scoping.
  const keyParam = request.nextUrl.searchParams.get('key')
  const appParam = request.nextUrl.searchParams.get('app')?.toLowerCase()

  if (keyParam) {
    // When ?key= is present, we forward the raw key so the layout can
    // read it via headers(). The auth pages resolve appName client-side.
    request.headers.set('x-publishable-key', keyParam)
    // Don't set x-app-theme from the key here — that requires an async
    // API call. The client-side pages handle this with data-app attribute.
  } else if (appParam) {
    // Legacy ?app= fallback for first-party mode
    const validApp = VALID_APPS.has(appParam) ? appParam : undefined
    if (validApp) {
      request.headers.set('x-app-theme', validApp)
    }
  }

  // next-intl middleware handles locale routing
  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
