/**
 * Auth Middleware Factory for Next.js
 *
 * Provides centralized authentication middleware that works with:
 * - next-intl for i18n routing
 * - 3 authentication modes (httpOnly, jwt, localStorage)
 * - Auto-detection based on environment
 * - Dynamic redirects to EZAuth login
 *
 * @example
 * ```ts
 * // apps/ezbill/web/src/middleware.ts
 * import { createAuthMiddleware } from '@ezstart/auth-sdk'
 *
 * export default createAuthMiddleware({
 *   appName: 'ezbill',
 *   authMode: 'httpOnly',  // Auto-switches to localStorage in localhost
 *   protectedPaths: ['/dashboard', '/clients', '/invoices'],
 *   locales: ['en', 'fr'],
 *   defaultLocale: 'en'
 * })
 * ```
 */

import { type NextRequest, NextResponse } from 'next/server'
import { getWebUrl, getCurrentEnvironment, isEzstartDomain } from '@ezstart/config/urls'
import { logger } from '@ezstart/logger'

export type AuthMode = 'localStorage' | 'httpOnly' | 'jwt'

export interface AuthMiddlewareConfig {
  /**
   * App name (e.g., 'ezbill', 'ezpay', 'green-pulse')
   */
  appName: string

  /**
   * Authentication mode
   * - 'httpOnly': For *.ezstart.xyz domains (secure cookies)
   * - 'jwt': For external domains (JWT validation)
   * - 'localStorage': For dev/simple apps (client-side token)
   *
   * Auto-detection:
   * - localhost → Always localStorage (regardless of config)
   * - production → Uses configured mode with validation
   *
   * @default 'localStorage'
   */
  authMode?: AuthMode

  /**
   * JWT public key for token validation (required if authMode='jwt')
   */
  jwtPublicKey?: string

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

  /**
   * Debug mode - logs all auth decisions without redirecting
   * Useful for troubleshooting auth issues in production
   *
   * When enabled:
   * - Shows which paths should be protected
   * - Shows auth token status
   * - Shows why redirects would happen
   * - But NEVER actually redirects
   *
   * @default false
   */
  debug?: boolean
}

/**
 * Determine the actual auth mode to use based on environment and configuration
 * Same logic as AuthProvider for consistency
 */
function resolveAuthMode(configuredMode: AuthMode, hostname: string, env: string): AuthMode {
  // Rule 1: Force localStorage in localhost (skip auth checks entirely)
  if (env === 'local') {
    return 'localStorage'
  }

  // Rule 2: httpOnly on ezstart domain (OK)
  if (configuredMode === 'httpOnly' && isEzstartDomain(hostname)) {
    return 'httpOnly'
  }

  // Rule 3: httpOnly on external domain (fallback)
  if (configuredMode === 'httpOnly' && !isEzstartDomain(hostname)) {
    return 'localStorage'
  }

  // Rule 4: JWT mode
  if (configuredMode === 'jwt') {
    return 'jwt'
  }

  return configuredMode
}

/**
 * Creates an authentication middleware for Next.js
 *
 * Features:
 * - ✅ Protects specified paths
 * - ✅ Auto-detects auth mode based on environment
 * - ✅ Skips auth checks in localhost (uses localStorage mode)
 * - ✅ Checks httpOnly cookie in production *.ezstart.xyz
 * - ✅ Validates JWT for external domains (coming soon)
 * - ✅ Redirects to EZAuth login with return URL
 * - ✅ Works with next-intl i18n
 * - ✅ Preserves original destination after login
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig) {
  const {
    appName,
    authMode = 'localStorage',
    // jwtPublicKey is reserved for future signature verification on external domains
    jwtPublicKey: _jwtPublicKey,
    protectedPaths,
    locales = ['en', 'fr'],
    // defaultLocale is reserved for future locale-aware redirects when intlMiddleware is omitted
    defaultLocale: _defaultLocale = 'en',
    cookieName = 'ezauth_session',
    intlMiddleware,
    debug = false,
  } = config

  return function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Health check endpoint — returns 200 immediately for monitoring
    // No auth check, no i18n redirect, no locale detection
    if (pathname === '/health') {
      return new NextResponse('OK', { status: 200 })
    }

    const currentUrl = request.nextUrl.clone()
    const hostname = currentUrl.hostname

    // Detect environment
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
    const env = isLocalhost ? 'local' : getCurrentEnvironment()

    // Resolve actual auth mode
    const resolvedMode = resolveAuthMode(authMode, hostname, env)

    logger.debug(`[AuthMiddleware] ${pathname}`, {
      resolvedMode,
      env,
      hostname,
    })

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
      // localStorage mode: Skip middleware auth checks (client-side handles auth)
      // This is automatic in localhost, preventing redirect loops
      if (resolvedMode === 'localStorage') {
        // Client-side will handle redirect to login if needed
        // No middleware auth check required
        if (intlMiddleware) {
          return intlMiddleware(request)
        }
        return NextResponse.next()
      }

      // httpOnly mode: Check cookie
      if (resolvedMode === 'httpOnly') {
        const authCookie = request.cookies.get(cookieName)

        logger.debug(`[AuthMiddleware] httpOnly check`, {
          path: pathWithoutLocale,
          hasCookie: !!authCookie,
        })

        if (!authCookie) {
          // User not authenticated - redirect to EZAuth login
          const appOrigin = currentUrl.origin
          const ezauthUrl = getWebUrl('ezauth', env)

          // Build redirect URL with locale preserved (critical for i18n apps)
          // Without locale prefix, callback fails and creates redirect loop
          const localePrefix = locale ? `/${locale}` : ''
          const redirectUri = `${appOrigin}${localePrefix}/auth/callback`
          const returnTo = pathname // Full path with locale
          const loginUrl = new URL(`${ezauthUrl}/login`)

          loginUrl.searchParams.set('app', appName)
          loginUrl.searchParams.set('redirect_uri', redirectUri)
          if (returnTo !== '/' && returnTo !== `/${locale}`) {
            loginUrl.searchParams.set('return_to', returnTo) // Preserve original destination
          }

          logger.debug(`[AuthMiddleware] Redirecting to login`, {
            loginUrl: loginUrl.toString(),
            returnTo,
          })

          if (debug) {
            // In debug mode, don't actually redirect
            if (intlMiddleware) {
              return intlMiddleware(request)
            }
            return NextResponse.next()
          }

          return NextResponse.redirect(loginUrl)
        }
      }

      // jwt mode: Validate JWT token
      if (resolvedMode === 'jwt') {
        // TODO(AUTH-MW-JWT-002): Implement edge-compatible JWT validation.
        //
        // Scope decisions required before implementing:
        // - Token source: `Authorization: Bearer <jwt>` header, `ezauth_token`
        //   cookie, or both (cookie as a fallback for non-XHR navigations)?
        // - `JWT_PUBLIC_KEY` format: raw PEM vs JWK vs JWKS URL (rotation).
        // - Dependency: `jose` (edge-compatible) must be added as a peer dep
        //   to keep the middleware runnable in the Next.js Edge runtime.
        // - Failure mode: 401 JSON for XHR, 302 redirect to EZAuth `/login`
        //   (with `return_to`) for navigation requests.
        //
        // Until this is implemented, we deliberately skip the middleware
        // check and rely on the client-side `useAuth` guard to redirect
        // unauthenticated users from protected pages.
        if (intlMiddleware) {
          return intlMiddleware(request)
        }
        return NextResponse.next()
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
 * You MUST copy-paste this directly in your middleware.ts file.
 *
 * NOTE: Do NOT exclude `/health` — the middleware handles it with an instant 200 response
 * for monitoring health checks (no auth, no i18n, no redirect).
 *
 * @example
 * ```ts
 * export const config = {
 *   matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
 * }
 * ```
 */
export const RECOMMENDED_MIDDLEWARE_MATCHER = ['/((?!api|trpc|_next|_vercel|.*\\..*).*)']
