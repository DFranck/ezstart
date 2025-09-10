export const getApiUrl = (): string => {
  const isServer = typeof window === 'undefined'

  const baseUrl = isServer
    ? process.env.API_URL?.replace(/\/$/, '') || 'http://localhost:8888'
    : process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8888'

  const isClient = !isServer
  const isPageHttps = isClient && window.location.protocol === 'https:'
  const isApiHttp = baseUrl.startsWith('http://')

  if (isClient && isPageHttps && isApiHttp) {
    return '/api-proxy'
  }

  return baseUrl
}
