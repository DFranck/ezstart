/**
 * Auth Middleware Factory for Next.js
 *
 * Provides centralized authentication middleware that works with:
 * - next-intl for i18n routing
 * - httpOnly cookies for secure auth
 * - Dynamic redirects to EZAuth login
 *
 * @example
 * ```ts
 * // apps/ezbill/web/src/middleware.ts
 * import { createAuthMiddleware } from '@ezstart/auth-sdk'
 *
 * export default createAuthMiddleware({
 *   appName: 'ezbill',
 *   protectedPaths: ['/dashboard', '/clients', '/invoices'],
 *   locales: ['en', 'fr'],
 *   defaultLocale: 'en'
 * })
 * ```
 */

import { type NextRequest, NextResponse } from 'next/server'
import { getWebUrl, getCurrentEnvironment } from '@ezstart/config/urls'

export interface AuthMiddlewareConfig {
  /**
   * App name (e.g., 'ezbill', 'ezpay', 'tower-defense')
   */
  appName: string

  /**
   * Paths that require authentication (e.g., ['/dashboard', '/settings'])
   *
   * Supports:
   * - Exact match: '/dashboard'
   * - Prefix match: '/clients' matches '/clients/123'
   */
  protectedPaths: string[]

  /**
   * Supported locales for i18n
   * @default ['en', 'fr']
   */
  locales?: readonly string[] | string[]

  /**
   * Default locale
   * @default 'en'
   */
  defaultLocale?: string

  /**
   * Cookie name for auth session
   * @default 'ezauth_session'
   */
  cookieName?: string

  /**
   * Custom i18n middleware (optional)
   * If provided, will be called after auth check
   */
  intlMiddleware?: (request: NextRequest) => NextResponse | Response
}

/**
 * Creates an authentication middleware for Next.js
 *
 * Features:
 * - ✅ Protects specified paths
 * - ✅ Checks httpOnly cookie for auth
 * - ✅ Redirects to EZAuth login with return URL
 * - ✅ Works with next-intl i18n
 * - ✅ Preserves original destination after login
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig) {
  const {
    appName,
    protectedPaths,
    locales = ['en', 'fr'],
    defaultLocale = 'en',
    cookieName = 'ezauth_session',
    intlMiddleware,
  } = config

  return function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Extract locale from pathname (e.g., /en/dashboard -> en, /dashboard -> null)
    let locale: string | null = null
    let pathWithoutLocale = pathname

    for (const loc of locales) {
      if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
        locale = loc
        pathWithoutLocale = pathname.slice(loc.length + 1) || '/'
        break
      }
    }

    // Normalize path (ensure it starts with /)
    if (!pathWithoutLocale.startsWith('/')) {
      pathWithoutLocale = `/${pathWithoutLocale}`
    }

    // Check if current path is protected
    const isProtectedPath = protectedPaths.some(protectedPath => {
      // Exact match or prefix match
      return (
        pathWithoutLocale === protectedPath || pathWithoutLocale.startsWith(`${protectedPath}/`)
      )
    })

    if (isProtectedPath) {
      // Check for auth cookie (httpOnly mode)
      const authCookie = request.cookies.get(cookieName)

      if (!authCookie) {
        // User not authenticated - redirect to EZAuth login
        const currentUrl = request.nextUrl.clone()
        const appOrigin = currentUrl.origin

        // Get EZAuth URL based on environment
        // IMPORTANT: Middleware runs server-side, so getCurrentEnvironment() may fallback to 'development'
        // We need to detect localhost from the request hostname
        const hostname = currentUrl.hostname
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
        const env = isLocalhost ? 'local' : getCurrentEnvironment()
        const ezauthUrl = getWebUrl('ezauth', env)

        // Build redirect URL with original path preserved
        const redirectUri = `${appOrigin}/auth/callback`
        const returnTo = pathname // Full path with locale
        const loginUrl = new URL(`${ezauthUrl}/login`)

        loginUrl.searchParams.set('app', appName)
        loginUrl.searchParams.set('redirect_uri', redirectUri)
        if (returnTo !== '/' && returnTo !== `/${locale}`) {
          loginUrl.searchParams.set('return_to', returnTo) // Preserve original destination
        }

        return NextResponse.redirect(loginUrl)
      }
    }

    // If intl middleware provided, apply it
    if (intlMiddleware) {
      return intlMiddleware(request)
    }

    // No i18n middleware - continue
    return NextResponse.next()
  }
}

/**
 * Recommended matcher config for Next.js middleware
 * Excludes API routes, static files, etc.
 *
 * IMPORTANT: Next.js requires the config export to be a literal object in middleware.ts
 * You MUST copy-paste this directly in your middleware.ts file:
 *
 * @example
 * ```ts
 * export const config = {
 *   matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
 * }
 * ```
 */
export const RECOMMENDED_MIDDLEWARE_MATCHER = ['/((?!api|trpc|_next|_vercel|.*\\..*).*)']