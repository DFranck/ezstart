// apps/ezstart/web/middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  // Health check endpoint — returns 200 immediately for monitoring
  if (request.nextUrl.pathname === '/health') {
    return new NextResponse('OK', { status: 200 })
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
