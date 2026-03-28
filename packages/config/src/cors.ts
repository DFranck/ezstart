import { URLS, AppName, getAllWebUrls } from './urls.js'

/**
 * Get all allowed CORS origins for a given API
 *
 * @example
 * ```typescript
 * // In EZAuth API
 * const allowedOrigins = getAllowedOrigins('ezauth')
 * // Returns all web URLs from all apps that might call this API
 * ```
 */
export function getAllowedOrigins(apiApp: AppName): string[] {
  const origins: string[] = []

  // Add the API's own web URLs (for same-app calls)
  origins.push(...getAllWebUrls(apiApp))

  // Add specific cross-app origins based on dependencies
  switch (apiApp) {
    case 'ezauth':
      // EZAuth is called by ALL web apps (SSO)
      Object.keys(URLS).forEach((app) => {
        origins.push(...getAllWebUrls(app as AppName))
      })
      break

    case 'ezpay':
      // EZPay is called by apps that need payments
      origins.push(...getAllWebUrls('ezpay'))
      origins.push(...getAllWebUrls('ezbill')) // Invoice payments
      origins.push(...getAllWebUrls('fengshui')) // Feng Shui consultations
      break

    case 'ezbill':
      // EZBill API called only by EZBill web
      origins.push(...getAllWebUrls('ezbill'))
      break

    case 'green-pulse':
      // GreenPulse API called only by GreenPulse web
      origins.push(...getAllWebUrls('green-pulse'))
      break

    case 'gacha-analyzer':
      // Gacha Analyzer API called only by Gacha Analyzer web
      origins.push(...getAllWebUrls('gacha-analyzer'))
      break

    case 'ezstart':
      // EZStart API (monitoring) is called by ALL web apps
      Object.keys(URLS).forEach((app) => {
        origins.push(...getAllWebUrls(app as AppName))
      })
      break

    default:
      // By default, only same-app calls
      origins.push(...getAllWebUrls(apiApp))
  }

  // Remove duplicates and return
  return Array.from(new Set(origins))
}

/**
 * Express CORS middleware configuration
 *
 * @example
 * ```typescript
 * import { createCorsConfig } from '@ezstart/config/cors'
 * import cors from 'cors'
 *
 * app.use(cors(createCorsConfig('ezauth')))
 * ```
 */
export function createCorsConfig(apiApp: AppName) {
  const allowedOrigins = getAllowedOrigins(apiApp)

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true)
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.warn(`⚠️ [CORS] Blocked origin: ${origin}`)
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }
}

/**
 * Get ALLOWED_ORIGINS environment variable value
 * Useful for Railway/Vercel config
 */
export function getOriginsList(apiApp: AppName): string {
  return getAllowedOrigins(apiApp).join(',')
}
