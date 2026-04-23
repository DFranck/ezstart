// apps/ezauth/web/src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { fetchKeyConfigCached } from './server/key-config-cache'

/** Allowed app values for legacy `?app=` theme scoping */
const VALID_APPS = new Set(['ezauth', 'ezstart', 'ezbill', 'ezpay', 'green-pulse', 'fengshui'])

const intlMiddleware = createMiddleware(routing)

/**
 * Resolve the EZAuth API URL used to fetch `/keys/config` during SSR. We read
 * the public env var (same source the client uses) and fall back to
 * `http://localhost:6110` in dev.
 */
function resolveApiUrl(): string {
  return process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'
}

export default async function middleware(request: NextRequest) {
  // Health check endpoint — returns 200 immediately for monitoring
  if (request.nextUrl.pathname === '/health') {
    return new NextResponse('OK', { status: 200 })
  }

  // Resolve app theme from URL params.
  // ?key= (publishable key) takes priority over ?app= (legacy).
  const keyParam = request.nextUrl.searchParams.get('key')
  const appParam = request.nextUrl.searchParams.get('app')?.toLowerCase()

  // Mutate the incoming request's headers so server components reading
  // `headers()` during the render pass see our custom `x-app-*` keys. This
  // is how both next-intl and the existing ezauth middleware propagate
  // request-scoped data to RSC.
  if (keyParam) {
    request.headers.set('x-publishable-key', keyParam)

    // Try to resolve the owning Application + theme synchronously during SSR
    // so the first-render paint is already white-labeled (zero flash). Any
    // failure here is non-fatal — the client-side `useKeyConfig` hook will
    // reconcile the theme after hydration.
    try {
      const config = await fetchKeyConfigCached(keyParam, resolveApiUrl())
      if (config) {
        request.headers.set('x-app-theme', config.appName)
        if (config.theme) {
          // Stringify only the minimal token set — drops undefined keys so
          // the header stays small and predictable.
          request.headers.set('x-app-theme-tokens', JSON.stringify(config.theme))
        }
      }
    } catch {
      // Swallow — middleware must not block render. Client hook will recover.
    }
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
