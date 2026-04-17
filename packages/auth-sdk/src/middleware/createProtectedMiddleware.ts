/**
 * SSR Auth Middleware Factory for Next.js
 *
 * Protects routes server-side to prevent flash of unauthorized content.
 * Runs in Next.js Edge Runtime — no Node.js APIs, no external crypto libs.
 *
 * Features:
 * - Checks `ezauth_token` httpOnly cookie (JWT set by EZAuth login-cookie flow)
 * - Decodes JWT payload without signature verification (speed — full verification happens in the API)
 * - Checks token expiry
 * - Role-based access control via `globalRoles` and `appRoles` in JWT payload
 * - Handles next-intl locale prefixes (`/en/`, `/fr/`, `/vi/`, etc.)
 * - Redirects unauthenticated users to EZAuth SSO login with `redirect_uri`
 *
 * @example
 * ```ts
 * // apps/green-pulse/web/src/middleware.ts
 * import { createProtectedMiddleware } from '@ezstart/auth-sdk/middleware'
 *
 * export default createProtectedMiddleware({
 *   appName: 'green-pulse',
 *   publicPaths: ['/', '/earthday', '/about'],
 *   adminPaths: [{ path: '/admin', roles: ['admin', 'superadmin'] }],
 * })
 *
 * export const config = {
 *   matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
 * }
 * ```
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { JWTPayload } from '../core/types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProtectedMiddlewareConfig {
  /** App name for auth context (e.g., 'green-pulse', 'ezbill') */
  appName: string

  /**
   * Paths accessible without authentication.
   * Matching is prefix-based: `'/'` matches only the root,
   * `'/about'` matches `/about` and `/about/team`.
   * Locale prefixes are stripped before matching.
   * @default ['/']
   */
  publicPaths?: string[]

  /**
   * Explicitly protected paths. When provided, ONLY these paths require auth.
   * When omitted, all paths except `publicPaths` require auth.
   * Prefix-based matching (same as publicPaths).
   */
  protectedPaths?: string[]

  /**
   * Paths requiring specific roles. Checked against `globalRoles` and
   * `appRoles[appName]` in the JWT payload.
   * Prefix-based matching.
   */
  adminPaths?: Array<{ path: string; roles: string[] }>

  /**
   * Login page URL. Defaults to EZAuth SSO (`/login` on the ezauth web app).
   * When set, overrides the auto-detected EZAuth URL.
   */
  loginUrl?: string

  /**
   * Cookie name containing the JWT.
   * @default 'ezauth_token'
   */
  cookieName?: string

  /**
   * Supported locales for next-intl i18n routing.
   * @default ['en', 'fr']
   */
  locales?: readonly string[] | string[]

  /**
   * Default locale.
   * @default 'en'
   */
  defaultLocale?: string
}

export type NextMiddleware = (request: NextRequest) => NextResponse | Response

// ---------------------------------------------------------------------------
// JWT helpers (Edge-safe — no Node.js APIs, no external libs)
// ---------------------------------------------------------------------------

/**
 * Decode a JWT payload without signature verification.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Base64url → Base64 → decode
    const base64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')

    const jsonStr = atob(base64)
    return JSON.parse(jsonStr) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Check if a JWT payload has expired.
 * Returns true if expired or if `exp` is missing.
 */
function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) return true
  // exp is in seconds, Date.now() in ms
  return Date.now() >= payload.exp * 1000
}

/**
 * Check if the JWT payload has at least one of the required roles
 * for the given app. Checks both `globalRoles` and `appRoles[appName]`.
 */
function hasRequiredRole(payload: JWTPayload, appName: string, requiredRoles: string[]): boolean {
  const userGlobalRoles = payload.globalRoles ?? []
  const userAppRoles = payload.appRoles?.[appName] ?? []
  const allUserRoles = [...userGlobalRoles, ...userAppRoles]

  return requiredRoles.some(role => allUserRoles.includes(role))
}

// ---------------------------------------------------------------------------
// Path matching helpers
// ---------------------------------------------------------------------------

/**
 * Strip the locale prefix from a pathname.
 * e.g., `/en/dashboard` → `/dashboard`, `/fr` → `/`
 */
function stripLocale(
  pathname: string,
  locales: readonly string[] | string[]
): {
  locale: string | null
  path: string
} {
  for (const loc of locales) {
    if (pathname === `/${loc}`) {
      return { locale: loc, path: '/' }
    }
    if (pathname.startsWith(`/${loc}/`)) {
      return { locale: loc, path: pathname.slice(loc.length + 1) || '/' }
    }
  }
  return { locale: null, path: pathname }
}

/**
 * Check if a path matches a pattern (exact or prefix).
 * `'/'` only matches exactly `/`.
 * `'/admin'` matches `/admin` and `/admin/settings`.
 */
function pathMatches(path: string, pattern: string): boolean {
  if (pattern === '/') return path === '/'
  return path === pattern || path.startsWith(`${pattern}/`)
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Create a Next.js middleware that protects routes server-side.
 *
 * The middleware checks for the `ezauth_token` cookie, decodes the JWT payload
 * (without cryptographic verification — that happens in the API layer), checks
 * expiry and roles, and redirects unauthorized requests to EZAuth SSO login.
 */
export function createProtectedMiddleware(config: ProtectedMiddlewareConfig): NextMiddleware {
  const {
    appName,
    publicPaths = ['/'],
    protectedPaths,
    adminPaths = [],
    loginUrl,
    cookieName = 'ezauth_token',
    locales = ['en', 'fr'],
    defaultLocale = 'en',
  } = config

  return function middleware(request: NextRequest): NextResponse | Response {
    const { pathname } = request.nextUrl

    // Strip locale prefix for path matching
    const { locale, path: cleanPath } = stripLocale(pathname, locales)

    // -----------------------------------------------------------------------
    // 1. Determine if this path needs protection
    // -----------------------------------------------------------------------

    // Check if path is explicitly public
    const isPublic = publicPaths.some(pp => pathMatches(cleanPath, pp))

    // Determine if path is protected
    let isProtected: boolean
    if (protectedPaths) {
      // Explicit mode: only listed paths are protected
      isProtected = protectedPaths.some(pp => pathMatches(cleanPath, pp))
    } else {
      // Default mode: everything except public paths is protected
      isProtected = !isPublic
    }

    // Check if path requires specific roles
    const adminMatch = adminPaths.find(ap => pathMatches(cleanPath, ap.path))

    // If not protected and not an admin path, allow through
    if (!isProtected && !adminMatch) {
      return NextResponse.next()
    }

    // -----------------------------------------------------------------------
    // 2. Check authentication
    // -----------------------------------------------------------------------

    const tokenCookie = request.cookies.get(cookieName)
    const token = tokenCookie?.value

    if (!token) {
      // No token — redirect to login
      return buildLoginRedirect(request, appName, loginUrl, locale, defaultLocale)
    }

    // Decode JWT payload
    const payload = decodeJwtPayload(token)

    if (!payload) {
      // Malformed token — redirect to login
      return buildLoginRedirect(request, appName, loginUrl, locale, defaultLocale)
    }

    // Check expiry
    if (isTokenExpired(payload)) {
      // Expired token — redirect to login
      return buildLoginRedirect(request, appName, loginUrl, locale, defaultLocale)
    }

    // -----------------------------------------------------------------------
    // 3. Check roles for admin paths
    // -----------------------------------------------------------------------

    if (adminMatch) {
      if (!hasRequiredRole(payload, appName, adminMatch.roles)) {
        // User authenticated but lacks required role — return 403-like redirect
        // Redirect to home (with locale if present)
        const homeUrl = request.nextUrl.clone()
        homeUrl.pathname = locale ? `/${locale}` : '/'
        return NextResponse.redirect(homeUrl)
      }
    }

    // -----------------------------------------------------------------------
    // 4. Authorized — continue
    // -----------------------------------------------------------------------

    return NextResponse.next()
  }
}

// ---------------------------------------------------------------------------
// Redirect builder
// ---------------------------------------------------------------------------

/**
 * Build a redirect URL to the EZAuth login page.
 * Preserves the original destination via `redirect_uri` and `return_to` params.
 */
function buildLoginRedirect(
  request: NextRequest,
  appName: string,
  customLoginUrl: string | undefined,
  locale: string | null,
  defaultLocale: string
): NextResponse {
  const currentUrl = request.nextUrl.clone()

  // Determine login base URL
  let loginBase: string
  if (customLoginUrl) {
    loginBase = customLoginUrl
  } else {
    // Auto-detect EZAuth URL based on environment
    const isLocalhost = currentUrl.hostname === 'localhost' || currentUrl.hostname === '127.0.0.1'
    if (isLocalhost) {
      loginBase = 'http://localhost:6111'
    } else {
      // Production: EZAuth web URL
      loginBase = 'https://ezauth.ezstart.xyz'
    }
  }

  // Build callback URI (where EZAuth redirects back after login)
  const localePrefix = locale ? `/${locale}` : `/${defaultLocale}`
  const redirectUri = `${currentUrl.origin}${localePrefix}/auth/callback`

  // Build login URL with params
  const loginRedirect = new URL(`${loginBase}/login`)
  loginRedirect.searchParams.set('app', appName)
  loginRedirect.searchParams.set('redirect_uri', redirectUri)

  // Preserve original destination (so user lands back on the page they wanted)
  const returnTo = currentUrl.pathname
  if (returnTo !== '/' && returnTo !== `/${locale}`) {
    loginRedirect.searchParams.set('return_to', returnTo)
  }

  return NextResponse.redirect(loginRedirect)
}
