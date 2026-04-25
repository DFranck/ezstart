'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

/**
 * Detect the active locale from the current URL pathname.
 *
 * Matches the leading 2- or 3-letter segment (e.g. `/en/...`, `/fr/...`,
 * `/vi/...`). Returns the matched segment lowercased, or `'en'` when no
 * locale prefix is present. This avoids any dependency on `next-intl` or
 * other i18n libraries — keeping the auth-sdk agnostic.
 *
 * @internal
 */
function detectLocaleFromPathname(pathname: string | null | undefined): string {
  if (!pathname) return 'en'
  const parts = pathname.split('/').filter(Boolean)
  const first = parts[0]
  if (typeof first === 'string' && /^[a-z]{2,3}$/i.test(first)) {
    return first.toLowerCase()
  }
  return 'en'
}

/**
 * Returns navigation hrefs that auto-preserve the current `key` (or legacy `app`)
 * and `redirect_uri` search params across auth pages (login, register,
 * forgot-password, reset-password).
 *
 * Hrefs are automatically prefixed with the active locale (e.g. `/en/login`,
 * `/fr/register`) so they work correctly under Next.js `[locale]` routing
 * without relying on a middleware redirect. The locale is detected from the
 * URL pathname (no dependency on `next-intl`).
 *
 * `?key=` takes priority over `?app=` when both are present.
 */
export function useAuthNavigation() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const locale = detectLocaleFromPathname(pathname)

  return useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.delete('token')
    const qs = params.toString()
    const suffix = qs ? `?${qs}` : ''
    const localePrefix = locale ? `/${locale}` : ''
    const build = (path: string) => `${localePrefix}${path}${suffix}`

    // ?key= takes priority — it IS the app identifier
    const publishableKey = searchParams?.get('key') || undefined
    // ?app= is the legacy fallback for first-party mode
    const app = searchParams?.get('app') || undefined

    return {
      /** Publishable key from `?key=` param (Clerk-like identification). */
      publishableKey,
      /** Legacy app name from `?app=` param (first-party fallback). */
      app,
      redirectUri: searchParams?.get('redirect_uri') || undefined,
      /** Active locale (e.g. `'en'`, `'fr'`) detected from the URL pathname. */
      locale,
      /**
       * Preserved query string suffix (with leading `?`) — empty when no params.
       * Append manually to an unprefixed `*Path` when using a locale-aware
       * `<Link>` component which re-prepends the locale itself.
       */
      searchSuffix: suffix,
      // ── Unprefixed paths (NO locale, NO query) ─────────────────────────
      /** `/login` (no locale, no query). Pair with `searchSuffix`. */
      loginPath: '/login',
      /** `/register` (no locale, no query). Pair with `searchSuffix`. */
      registerPath: '/register',
      /** `/forgot-password` (no locale, no query). Pair with `searchSuffix`. */
      forgotPasswordPath: '/forgot-password',
      /** `/reset-password` (no locale, no query). Pair with `searchSuffix`. */
      resetPasswordPath: '/reset-password',
      // ── Pre-built locale-prefixed hrefs (with query) ───────────────────
      loginHref: build('/login'),
      registerHref: build('/register'),
      forgotPasswordHref: build('/forgot-password'),
      resetPasswordHref: build('/reset-password'),
      buildAuthPath: build,
    }
  }, [searchParams, locale])
}
