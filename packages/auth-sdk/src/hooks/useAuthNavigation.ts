'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

/**
 * Returns navigation hrefs that auto-preserve the current `app` and
 * `redirect_uri` search params across auth pages (login, register,
 * forgot-password, reset-password).
 */
export function useAuthNavigation() {
  const searchParams = useSearchParams()

  return useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.delete('token')
    const qs = params.toString()
    const suffix = qs ? `?${qs}` : ''
    const build = (path: string) => `${path}${suffix}`

    return {
      app: searchParams?.get('app') || undefined,
      redirectUri: searchParams?.get('redirect_uri') || undefined,
      loginHref: build('/login'),
      registerHref: build('/register'),
      forgotPasswordHref: build('/forgot-password'),
      resetPasswordHref: build('/reset-password'),
      buildAuthPath: build,
    }
  }, [searchParams])
}
