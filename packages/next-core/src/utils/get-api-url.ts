import { getApiUrl as getApiUrlGeneric, type ApiUrlConfig } from '@ezstart/ui/utils'

/**
 * Next.js specific wrapper for getApiUrl that uses NEXT_PUBLIC_ environment variables
 */
export const getApiUrl = (config: Partial<ApiUrlConfig> = {}): string => {
  return getApiUrlGeneric({
    serverUrl: process.env.API_URL,
    clientUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    fallbackUrl: 'http://localhost:8888',
    ...config
  })
}