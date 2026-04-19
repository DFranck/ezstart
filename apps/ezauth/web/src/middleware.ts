// apps/ezauth/web/src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/** Allowed app values for `?app=` theme scoping */
const VALID_APPS = new Set(['ezauth', 'ezstart', 'ezbill', 'ezpay', 'green-pulse', 'fengshui'])

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  // Health check endpoint — returns 200 immediately for monitoring
  if (request.nextUrl.pathname === '/health') {
    return new NextResponse('OK', { status: 200 })
  }

  // Read ?app= from URL and forward as a request header so the server
  // layout can read it via headers() and set data-app on <html> at SSR time.
  const appParam = request.nextUrl.searchParams.get('app')?.toLowerCase()
  const validApp = appParam && VALID_APPS.has(appParam) ? appParam : undefined

  if (validApp) {
    // Setting on request.headers makes it available to server components
    // via the headers() API in Next.js
    request.headers.set('x-app-theme', validApp)
  }

  // next-intl middleware handles locale routing
  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
