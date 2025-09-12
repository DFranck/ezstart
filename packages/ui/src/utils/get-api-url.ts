export interface ApiUrlConfig {
  serverUrl?: string
  clientUrl?: string
  fallbackUrl?: string
  useProxy?: boolean
  proxyPath?: string
}

export const getApiUrl = (config: ApiUrlConfig = {}): string => {
  const {
    serverUrl,
    clientUrl,
    fallbackUrl = 'http://localhost:8888',
    useProxy = true,
    proxyPath = '/api-proxy',
  } = config

  const isServer = typeof window === 'undefined'

  // Get base URL from config or environment variables
  const baseUrl = isServer
    ? (serverUrl || process.env.API_URL || fallbackUrl).replace(/\/$/, '')
    : (clientUrl || process.env.NEXT_PUBLIC_API_URL || fallbackUrl).replace(/\/$/, '')

  // Framework-agnostic HTTPS proxy logic
  const isClient = !isServer
  const isPageHttps = isClient && window.location.protocol === 'https:'
  const isApiHttp = baseUrl.startsWith('http://')

  if (isClient && isPageHttps && isApiHttp && useProxy) {
    return proxyPath
  }

  return baseUrl
}
