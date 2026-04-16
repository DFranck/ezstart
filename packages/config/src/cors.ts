import { logger } from '@ezstart/logger'
import { URLS, AppName, getAllWebUrls, getRegistry } from './urls.js'

/**
 * CORS dependency map: which apps can call which API.
 * 'all' means every registered app is allowed.
 * An array lists specific allowed callers.
 * Apps not listed here default to same-app only.
 */
const CORS_DEPENDENCIES: Record<string, 'all' | string[]> = {
  ezauth: 'all', // SSO — called by ALL web apps
  ezstart: 'all', // Monitoring — called by ALL web apps
  ezpay: ['ezpay', 'ezbill', 'fengshui', 'ezstart', 'green-pulse'], // Payment callers
  ezbill: ['ezbill'],
  'green-pulse': ['green-pulse'],
  'gacha-analyzer': ['gacha-analyzer'],
}

/**
 * Set or update CORS dependencies for an API app.
 *
 * @example
 * ```typescript
 * setCorsDepencies('my-api', ['my-api', 'other-app'])
 * setCorsDepencies('shared-api', 'all')
 * ```
 */
export function setCorsDependencies(apiApp: string, deps: 'all' | string[]): void {
  CORS_DEPENDENCIES[apiApp] = deps
}

/**
 * Get the raw CORS dependency config for an API app
 */
export function getCorsDependencies(apiApp: string): 'all' | string[] | undefined {
  return CORS_DEPENDENCIES[apiApp]
}

/**
 * Collect all web URLs for a given app name, including dynamically registered apps.
 * Falls back to getAllWebUrls for known AppName, or reads from registry.
 */
function collectWebUrls(appName: string): string[] {
  // Try the static URLS first (typed AppName)
  if (appName in URLS) {
    return getAllWebUrls(appName as AppName)
  }
  // Fallback: check registry for dynamically registered apps
  const registry = getRegistry()
  const entry = registry[appName]
  if (!entry) return []
  const { web } = entry.urls
  return [web.local, web.development, web.staging, web.production].filter(Boolean) as string[]
}

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

  const deps = CORS_DEPENDENCIES[apiApp]

  if (deps === 'all') {
    // Allow every registered app (static + dynamic)
    const registry = getRegistry()
    Object.keys(registry).forEach(app => {
      origins.push(...collectWebUrls(app))
    })
  } else if (Array.isArray(deps)) {
    // Allow specific apps
    deps.forEach(app => {
      origins.push(...collectWebUrls(app))
    })
  }
  // else: no deps entry → same-app only (already added above)

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
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true)
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        logger.warn(`[CORS] Blocked origin: ${origin}`)
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
