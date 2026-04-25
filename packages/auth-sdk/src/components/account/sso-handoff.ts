'use client'

import { ApiError, apiCall } from '@ezstart/api-sdk'

/**
 * Create a cross-domain SSO handoff URL.
 *
 * Calls the EZAuth SSO authorize endpoint and builds a callback URL on the
 * target origin. When `targetUrl` is same-origin as the current page, the
 * URL is returned unchanged (no handoff needed).
 *
 * @internal
 */
export async function createSsoHandoff({
  targetUrl,
  app,
}: {
  targetUrl: string
  app: string
}): Promise<string> {
  if (typeof window !== 'undefined') {
    const sameOriginTarget = new URL(targetUrl)
    if (sameOriginTarget.origin === window.location.origin) {
      return targetUrl
    }
  }

  let data: { code: string; expiresIn: number }
  try {
    data = await apiCall<{ code: string; expiresIn: number }>('/auth/sso/authorize', {
      appName: 'ezauth',
      method: 'POST',
      body: { app, redirectUri: targetUrl },
    })
  } catch (err) {
    if (ApiError.isApiError(err)) {
      throw new Error(err.message || 'Failed to initiate SSO handoff')
    }
    throw err
  }

  const target = new URL(targetUrl)
  const locale = target.pathname.split('/')[1] || 'en'
  const callbackPath = `/${locale}/auth/sso-callback`
  const next = target.pathname + target.search
  const callbackUrl = new URL(callbackPath, target.origin)
  callbackUrl.searchParams.set('code', data.code)
  callbackUrl.searchParams.set('next', next)
  return callbackUrl.toString()
}
