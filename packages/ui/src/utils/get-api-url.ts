/**
 * @deprecated Use `getApiUrl` from '@ezstart/config/urls' instead.
 *
 * This file is kept for backward compatibility but will be removed in future versions.
 * Migrate to @ezstart/config:
 *
 * ```ts
 * import { getApiUrl } from '@ezstart/config/urls'
 * const apiUrl = getApiUrl('ezauth') // or 'ezpay', 'ezbill', etc.
 * ```
 */

export interface ApiUrlConfig {
  serverUrl?: string
  clientUrl?: string
  fallbackUrl?: string
  useProxy?: boolean
  proxyPath?: string
}

/**
 * @deprecated Use `getApiUrl(appName)` from '@ezstart/config/urls' instead.
 */
export const getApiUrl = (config: ApiUrlConfig = {}): string => {
  const {
    serverUrl,
    clientUrl,
    fallbackUrl = 'http://localhost:8888',
    useProxy = true,
    proxyPath = '/api-proxy',
  } = config

  // If explicit URLs are provided, use legacy logic
  if (serverUrl || clientUrl) {
    const isServer = typeof window === 'undefined'
    const baseUrl = isServer
      ? (serverUrl || fallbackUrl).replace(/\/$/, '')
      : (clientUrl || fallbackUrl).replace(/\/$/, '')

    // Framework-agnostic HTTPS proxy logic
    const isClient = !isServer
    const isPageHttps = isClient && window.location.protocol === 'https:'
    const isApiHttp = baseUrl.startsWith('http://')

    if (isClient && isPageHttps && isApiHttp && useProxy) {
      return proxyPath
    }

    return baseUrl
  }

  // Otherwise, try to infer from environment variables (legacy behavior)
  // This won't work well anymore - users should migrate to @ezstart/config
  console.warn(
    '[@ezstart/ui] getApiUrl() is deprecated. Please use getApiUrl(appName) from @ezstart/config/urls'
  )

  const isServer = typeof window === 'undefined'
  const baseUrl = isServer
    ? (process.env.API_URL || fallbackUrl).replace(/\/$/, '')
    : (process.env.NEXT_PUBLIC_API_URL || fallbackUrl).replace(/\/$/, '')

  return baseUrl
}
