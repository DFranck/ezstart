'use client'

import React, { type ReactNode, useEffect, useState } from 'react'
import { useAuth } from './hooks.js'

// ---------------------------------------------------------------------------
// DefaultLoadingFallback (agnostic — no @ezstart/ui dependency)
// ---------------------------------------------------------------------------

/**
 * Default loading fallback rendered while `RequireAuth` waits for the auth
 * store to hydrate from storage (and during the brief window before an
 * auto-redirect navigation kicks in).
 *
 * Implemented as a fixed full-screen overlay with an inline SVG spinner so
 * the `react/` layer stays 100% agnostic — no dependency on `@ezstart/ui`,
 * Tailwind, or any styling library. Consumers who want a styled, shadcn-
 * compatible look can pass `<RequireAuthLoader />` from
 * `@ezstart/auth-sdk/components` to `loadingComponent`.
 *
 * The overlay is intentionally transparent (no background) so it sits cleanly
 * over whatever skeleton/page chrome the app already renders. Spinner color
 * inherits via `currentColor`.
 *
 * @internal
 */
function DefaultLoadingFallback() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        pointerEvents: 'none',
      }}
      aria-busy="true"
      role="status"
      aria-label="Loading"
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          cx="20"
          cy="20"
          r="18"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeDasharray="60 40"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 20 20"
            to="360 20 20"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RequireAuth
// ---------------------------------------------------------------------------

/**
 * Detect the active locale from the current URL pathname.
 *
 * Matches the leading 2- or 3-letter segment (e.g. `/en/...`, `/fr/...`,
 * `/vi/...`). Returns the matched segment lowercased, or `null` when no
 * locale prefix is present. Kept agnostic of `next-intl` so the auth-sdk
 * stays usable in any React app.
 *
 * @internal
 */
function detectLocaleFromPathname(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  const first = parts[0]
  if (typeof first === 'string' && /^[a-z]{2,3}$/i.test(first)) {
    return first.toLowerCase()
  }
  return null
}

/**
 * Build the auto-redirect URL when the user is not authenticated and no
 * `fallbackComponent` / `redirectTo` was provided.
 *
 * Pattern: `{locale-prefix}{loginPath}?redirect_uri={current-encoded-absolute-url}`
 *
 * The `redirect_uri` is built as an **absolute URL** (`window.location.origin`
 * + path + search + hash) because the ezauth backend `/api/auth/login` Zod
 * schema validates it with `z.string().url()` + a custom `http/https` protocol
 * check. Sending a relative path like `/en/admin` would yield a 422
 * `VALIDATION_ERROR` after the user submits the login form. The strict
 * validation is intentional (defense-in-depth against open-redirect abuse), so
 * the fix lives here in the SDK.
 *
 * Returns `loginPath` verbatim during SSR (`typeof window === 'undefined'`)
 * since there is no current URL to embed.
 *
 * @internal
 */
function buildLoginRedirect(loginPath: string): string {
  if (typeof window === 'undefined') return loginPath
  const locale = detectLocaleFromPathname(window.location.pathname)
  const localePrefix = locale ? `/${locale}` : ''
  const absoluteRedirectUri =
    window.location.origin +
    window.location.pathname +
    window.location.search +
    window.location.hash
  const params = new URLSearchParams({ redirect_uri: absoluteRedirectUri })
  return `${localePrefix}${loginPath}?${params.toString()}`
}

export interface RequireAuthProps {
  /** Content to show when authenticated. */
  children: ReactNode
  /**
   * Custom loading component shown during hydration (optional).
   *
   * When omitted, a minimal agnostic full-screen SVG spinner is rendered to
   * avoid a flash of empty DOM. Pass an explicit `null` to render nothing.
   * For a styled, shadcn-compatible loader use `<RequireAuthLoader />` from
   * `@ezstart/auth-sdk/components`.
   */
  loadingComponent?: ReactNode
  /**
   * Custom fallback rendered when not authenticated. When this prop is
   * provided (even as `null`), it disables the default auto-redirect.
   * Pass `null` explicitly to render nothing without redirecting (useful
   * for conditional UI like install prompts).
   */
  fallbackComponent?: ReactNode
  /**
   * Custom URL to redirect to when not authenticated. Overrides the default
   * auto-redirect to `{locale}{loginPath}?redirect_uri=...`.
   */
  redirectTo?: string
  /**
   * Path of the login page used by the default auto-redirect (without the
   * locale prefix). Defaults to `'/login'`. The component automatically
   * prepends the active locale detected from the URL pathname (e.g.
   * `/en/login`, `/fr/login`) and appends `?redirect_uri=<current absolute URL>`
   * so the user is returned here after sign-in. The `redirect_uri` is an
   * absolute URL (origin + path + search + hash) because the ezauth backend
   * Zod schema validates it strictly with `z.string().url()` + http/https
   * protocol check.
   */
  loginPath?: string
}

/**
 * RequireAuth - Wrapper component that requires authentication.
 *
 * Shows `loadingComponent` (or the built-in `DefaultLoadingFallback` when
 * the prop is omitted) during hydration, then either:
 * - Renders children if authenticated.
 * - Otherwise, picks the unauthenticated behavior in the following
 *   priority order:
 *   1. If `redirectTo` is set → `window.location.href = redirectTo`.
 *   2. If `fallbackComponent` is set (even as `null`) → render it.
 *   3. Default → auto-redirect to `{locale}{loginPath}?redirect_uri={current absolute URL}`
 *      so the user comes back here after login. Override `loginPath` to
 *      change the default `/login` path. Pass `fallbackComponent={null}`
 *      to opt out of the redirect and render nothing instead.
 *
 * Pass `loadingComponent={null}` to suppress the default spinner entirely.
 */
export function RequireAuth(props: RequireAuthProps) {
  const { children, loadingComponent, fallbackComponent, redirectTo, loginPath = '/login' } = props
  const { isAuthenticated } = useAuth()
  const [isHydrated, setIsHydrated] = useState(false)

  // Detect explicit prop presence (vs omission) so callers can opt out of
  // the auto-redirect default by passing `fallbackComponent={null}`.
  const hasFallbackProp = Object.prototype.hasOwnProperty.call(props, 'fallbackComponent')

  // Detect explicit `loadingComponent` presence so callers can opt out of
  // the default loading fallback by passing `loadingComponent={null}`.
  const hasLoadingProp = Object.prototype.hasOwnProperty.call(props, 'loadingComponent')
  const resolvedLoading = hasLoadingProp ? loadingComponent : <DefaultLoadingFallback />

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    if (isAuthenticated) return
    if (redirectTo) {
      if (typeof window !== 'undefined') {
        window.location.href = redirectTo
      }
      return
    }
    if (hasFallbackProp) return
    if (typeof window !== 'undefined') {
      window.location.href = buildLoginRedirect(loginPath)
    }
  }, [isHydrated, isAuthenticated, redirectTo, hasFallbackProp, loginPath])

  if (!isHydrated) {
    return <>{resolvedLoading ?? null}</>
  }

  if (!isAuthenticated && hasFallbackProp) {
    return <>{fallbackComponent ?? null}</>
  }

  if (!isAuthenticated) {
    // Auto-redirect path or explicit `redirectTo` is in flight; render the
    // loading component (or nothing) while the navigation happens to avoid
    // a flash of empty DOM.
    return <>{resolvedLoading ?? null}</>
  }

  return <>{children}</>
}

// ---------------------------------------------------------------------------
// AccessDenied
// ---------------------------------------------------------------------------

export interface AccessDeniedProps {
  /** Title (optional, default: "Access Denied") */
  title?: string
  /** Message (optional, default: "You must be logged in to access this page.") */
  message?: string
  /** Additional content to show (optional) */
  children?: ReactNode
  /** Custom action button (optional) */
  actionButton?: ReactNode
}

/**
 * AccessDenied - Pre-styled message for authentication failures.
 *
 * Simple component that can be used with RequireAuth.
 */
export function AccessDenied({
  title = 'Access Denied',
  message = 'You must be logged in to access this page.',
  children,
  actionButton,
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted-foreground text-center">{message}</p>
      {children}
      {actionButton}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SignedIn / SignedOut
// ---------------------------------------------------------------------------

export interface SignedInProps {
  children: ReactNode
}

/**
 * Conditional wrapper that only renders children when the user is authenticated.
 */
export function SignedIn({ children }: SignedInProps) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return null
  return <>{children}</>
}

export interface SignedOutProps {
  children: ReactNode
}

/**
 * Conditional wrapper that only renders children when the user is NOT authenticated.
 */
export function SignedOut({ children }: SignedOutProps) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return null
  return <>{children}</>
}
