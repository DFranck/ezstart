/**
 * Centralized URL configuration for all @ezstart apps
 *
 * Pattern:
 * - Local: localhost:50XX
 * - Dev: [app].vercel.app (Vercel default)
 * - Prod: [app].ezstart.xyz OR custom domain
 *
 * APIs:
 * - Local: localhost:50X0 (APIs end with 0)
 * - Prod: [app]-api.up.railway.app OR render
 */

export type Environment = 'local' | 'development' | 'production'
export type AppName =
  | 'ezstart'
  | 'ezauth'
  | 'ezbill'
  | 'ezpay'
  | 'fengshui'
  | 'tower-defense'
  | 'asc-tcd'
  | 'green-pulse'
  | 'monitoring'

export interface AppUrls {
  web: {
    local: string
    development: string
    production: string
  }
  api?: {
    local: string
    development?: string
    production: string
  }
}

/**
 * Complete URL mapping for all apps
 */
export const URLS: Record<AppName, AppUrls> = {
  ezstart: {
    web: {
      local: 'http://localhost:5050',
      development: 'https://ezstart-web.vercel.app',
      production: 'https://www.ezstart.xyz',
    },
  },

  ezauth: {
    web: {
      local: 'http://localhost:5015',
      development: 'https://ezstart-ezauth.vercel.app',
      production: 'https://ezauth.ezstart.xyz',
    },
    api: {
      local: 'http://localhost:5010',
      production: 'https://ezauth.up.railway.app',
    },
  },

  ezbill: {
    web: {
      local: 'http://localhost:5025',
      development: 'https://ezstart-ezbill.vercel.app',
      production: 'https://ezbill.ezstart.xyz',
    },
    api: {
      local: 'http://localhost:5020',
      production: 'https://ezbill.onrender.com',
    },
  },

  ezpay: {
    web: {
      local: 'http://localhost:5045',
      development: 'https://ezstart-ezpay.vercel.app',
      production: 'https://ezpay.ezstart.xyz',
    },
    api: {
      local: 'http://localhost:5040',
      production: 'https://ezpay-api.up.railway.app',
    },
  },

  fengshui: {
    web: {
      local: 'http://localhost:5065',
      development: 'https://fengshui.vercel.app',
      production: 'https://ezfengshui.ezstart.xyz',
    },
  },

  'tower-defense': {
    web: {
      local: 'http://localhost:5035',
      development: 'https://tower-defense-two.vercel.app',
      production: 'https://tower-defense.ezstart.xyz',
    },
    api: {
      local: 'http://localhost:5030',
      production: 'https://tower-defense-api.up.railway.app',
    },
  },

  'asc-tcd': {
    web: {
      local: 'http://localhost:5055',
      development: 'https://asc-tcd-web.vercel.app',
      production: 'https://www.asc-tcd.com',
    },
  },

  'green-pulse': {
    web: {
      local: 'http://localhost:5075',
      development: 'https://green-pulse-web.vercel.app',
      production: 'https://www.ai-greenpulse.com',
    },
    api: {
      local: 'http://localhost:5070',
      production: 'https://green-pulse-api.up.railway.app',
    },
  },

  monitoring: {
    web: {
      local: 'http://localhost:5050', // Monitoring dashboard is in ezstart
      development: 'https://ezstart-web.vercel.app',
      production: 'https://www.ezstart.xyz',
    },
    api: {
      local: 'http://localhost:5080',
      production: 'https://monitoring-api.up.railway.app',
    },
  },
}

/**
 * Get the current environment based on NODE_ENV or VERCEL_ENV
 */
export function getCurrentEnvironment(): Environment {
  // Vercel specific env var
  if (typeof process !== 'undefined' && process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV as Environment
  }

  // Standard NODE_ENV
  const nodeEnv = typeof process !== 'undefined' ? process.env.NODE_ENV : 'development'

  if (nodeEnv === 'production') return 'production'
  if (nodeEnv === 'development') return 'development'
  return 'local'
}

/**
 * Get web URL for an app in the current environment
 */
export function getWebUrl(app: AppName, env?: Environment): string {
  const environment = env || getCurrentEnvironment()
  return URLS[app].web[environment]
}

/**
 * Get API URL for an app in the current environment
 */
export function getApiUrl(app: AppName, env?: Environment): string {
  const environment = env || getCurrentEnvironment()
  const apiUrls = URLS[app].api

  if (!apiUrls) {
    throw new Error(`App ${app} does not have an API`)
  }

  // For development, fallback to production API if not defined
  if (environment === 'development' && !apiUrls.development) {
    return apiUrls.production
  }

  return apiUrls[environment] || apiUrls.production
}

/**
 * Get all web URLs for an app (useful for CORS)
 */
export function getAllWebUrls(app: AppName): string[] {
  const urls = URLS[app].web
  return [urls.local, urls.development, urls.production].filter(Boolean)
}

/**
 * Get all API URLs for an app (useful for CORS)
 */
export function getAllApiUrls(app: AppName): string[] {
  const apiUrls = URLS[app].api
  if (!apiUrls) return []

  return [apiUrls.local, apiUrls.development, apiUrls.production].filter(Boolean) as string[]
}

/**
 * Get port number for an app (web or API)
 * Usage: Start dev servers with the correct port from config
 *
 * @example
 * ```typescript
 * // Web app
 * const port = getPort('ezstart', 'web') // 5050
 *
 * // API
 * const port = getPort('ezauth', 'api') // 5010
 * ```
 */
export function getPort(app: AppName, type: 'web' | 'api' = 'web'): number {
  const url = type === 'api' ? URLS[app].api?.local : URLS[app].web.local

  if (!url) {
    throw new Error(`No ${type} URL defined for app: ${app}`)
  }

  const port = new URL(url).port
  return parseInt(port, 10)
}
