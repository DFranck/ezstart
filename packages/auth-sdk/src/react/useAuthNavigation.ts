'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useLocale } from 'next-intl'

/**
 * Returns navigation hrefs that auto-preserve the current `key` (or legacy `app`)
 * and `redirect_uri` search params across auth pages (login, register,
 * forgot-password, reset-password).
 *
 * Hrefs are automatically prefixed with the active locale (e.g. `/en/login`,
 * `/fr/register`) so they work correctly under Next.js `[locale]` routing
 * without relying on a middleware redirect.
 *
 * `?key=` takes priority over `?app=` when both are present.
 */
export function useAuthNavigation() {
  const searchParams = useSearchParams()
  const locale = useLocale()

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
      /** Active locale (e.g. `'en'`, `'fr'`) used to prefix all generated hrefs. */
      locale,
      loginHref: build('/login'),
      registerHref: build('/register'),
      forgotPasswordHref: build('/forgot-password'),
      resetPasswordHref: build('/reset-password'),
      buildAuthPath: build,
    }
  }, [searchParams, locale])
}
