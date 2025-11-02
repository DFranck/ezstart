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
 * Project metadata for monitoring and documentation
 */
export interface ProjectMetadata {
  /** Display name */
  name: string
  /** Brief description */
  description: string
  /** Emoji icon (fallback if no logo) */
  emoji: string
  /** Optional logo path (relative to public folder) */
  logo?: string
  /** GitHub repository path (relative to monorepo) */
  githubPath: string
  /** Deployment platform for web app */
  webPlatform?: 'vercel' | 'railway' | 'render' | 'custom'
  /** Deployment platform for API */
  apiPlatform?: 'vercel' | 'railway' | 'render' | 'custom'
  /** Is project active? (false = paused/archived, excluded from monitoring) */
  isActive?: boolean
}

/**
 * Complete URL mapping for all apps
 */
export const URLS: Record<AppName, AppUrls> = {
  ezstart: {
    web: {
      local: 'http://localhost:5005',
      development: 'https://ezstart-web.vercel.app',
      production: 'https://www.ezstart.xyz',
    },
    api: {
      local: 'http://localhost:5000',
      production: 'https://monitoring.ezstart.xyz',
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
      production: 'https://ezauth-api.ezstart.xyz',
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
      production: 'https://ezbill-api.ezstart.xyz',
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
      production: 'https://ezpay-api.ezstart.xyz',
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
      production: 'https://td-api.ezstart.xyz',
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
      production: 'https://greenpulse-api.ezstart.xyz',
    },
  },
}

/**
 * Project metadata for all apps
 */
export const PROJECT_METADATA: Record<AppName, ProjectMetadata> = {
  ezstart: {
    name: 'EZStart',
    description: 'Monorepo hub and monitoring platform',
    emoji: '🚀',
    logo: '/icons/icon-192x192.png',
    githubPath: 'apps/ezstart',
    webPlatform: 'vercel',
    apiPlatform: 'railway',
  },

  ezauth: {
    name: 'EZAuth',
    description: 'Centralized authentication and SSO service',
    emoji: '🔐',
    logo: '/icons/icon-192x192.png',
    githubPath: 'apps/ezauth',
    webPlatform: 'vercel',
    apiPlatform: 'railway',
  },

  ezbill: {
    name: 'EZBill',
    description: 'Invoicing and billing management',
    emoji: '💼',
    logo: '/icons/icon-192x192.png',
    githubPath: 'apps/ezbill',
    webPlatform: 'vercel',
    apiPlatform: 'railway',
  },

  ezpay: {
    name: 'EZPay',
    description: 'Universal payment processing service',
    emoji: '💳',
    logo: '/icons/icon-192x192.png',
    githubPath: 'apps/ezpay',
    webPlatform: 'vercel',
    apiPlatform: 'railway',
  },

  fengshui: {
    name: 'FengShui',
    description: 'Feng Shui consultation and analysis',
    emoji: '🎋',
    logo: '/icons/icon-192x192.png',
    githubPath: 'apps/fengshui',
    webPlatform: 'vercel',
  },

  'tower-defense': {
    name: 'Tower Defense',
    description: 'Multiplayer tower defense game',
    emoji: '🗼',
    logo: '/icons/icon-192x192.png',
    githubPath: 'apps/tower-defense',
    webPlatform: 'vercel',
    apiPlatform: 'railway',
    isActive: false, // Project paused
  },

  'asc-tcd': {
    name: 'ASC-TCD',
    description: 'Agence Sécurité Conseil TCD',
    emoji: '🛡️',
    logo: 'https://www.asc-tcd.com/images/logo.png',
    githubPath: 'apps/asc-tcd',
    webPlatform: 'vercel',
  },

  'green-pulse': {
    name: 'GreenPulse',
    description: 'AI-powered sustainability and carbon tracking',
    emoji: '🌱',
    logo: '/icons/icon-192x192.png',
    githubPath: 'apps/green-pulse',
    webPlatform: 'vercel',
    apiPlatform: 'railway',
  },
}

/**
 * Get the current environment based on NODE_ENV or VERCEL_ENV
 * Supports both server-side (Node.js) and client-side (browser) detection
 */
export function getCurrentEnvironment(): Environment {
  // Server-side: Check Vercel env var first
  if (typeof process !== 'undefined' && process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV as Environment
  }

  // Server-side: Standard NODE_ENV
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return 'production'
  }

  // Client-side: Detect from window.location.hostname
  // @ts-ignore - window exists in browser context
  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    // @ts-ignore - window exists in browser context
    const hostname = window.location.hostname

    // Production domains
    if (
      hostname === 'www.ai-greenpulse.com' ||
      hostname === 'www.ezstart.xyz' ||
      hostname === 'ezauth.ezstart.xyz' ||
      hostname === 'ezbill.ezstart.xyz' ||
      hostname === 'ezpay.ezstart.xyz' ||
      hostname === 'ezfengshui.ezstart.xyz' ||
      hostname === 'tower-defense.ezstart.xyz' ||
      hostname === 'www.asc-tcd.com'
    ) {
      return 'production'
    }

    // Development domains (Vercel preview)
    if (hostname.endsWith('.vercel.app')) {
      return 'development'
    }

    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'local'
    }
  }

  // Fallback: development (safe default for SSR)
  return 'development'
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

/**
 * Get project metadata for an app
 */
export function getProjectMetadata(app: AppName): ProjectMetadata {
  return PROJECT_METADATA[app]
}

/**
 * Get all app names
 */
export function getAllApps(): AppName[] {
  return Object.keys(URLS) as AppName[]
}

/**
 * Get all active app names (excludes paused/archived projects)
 */
export function getActiveApps(): AppName[] {
  return getAllApps().filter(app => {
    const metadata = PROJECT_METADATA[app]
    // Default to active if isActive is not specified
    return metadata.isActive !== false
  })
}

/**
 * Check if app is active (not paused/archived)
 */
export function isActive(app: AppName): boolean {
  const metadata = PROJECT_METADATA[app]
  // Default to active if isActive is not specified
  return metadata.isActive !== false
}

/**
 * Check if app has an API
 */
export function hasApi(app: AppName): boolean {
  return !!URLS[app].api
}

/**
 * Get GitHub URL for a project
 */
export function getGitHubUrl(app: AppName): string {
  const metadata = PROJECT_METADATA[app]
  return `https://github.com/DFranck/ezstart/tree/master/${metadata.githubPath}`
}

/**
 * Get logo URL for production environment
 * For PWA icons, returns the full production URL
 * For custom logos, returns as-is (already full URL)
 */
export function getLogoUrl(app: AppName): string | undefined {
  const metadata = PROJECT_METADATA[app]
  if (!metadata.logo) return undefined

  // If it's a full URL (like ASC-TCD), return as-is
  if (metadata.logo.startsWith('http')) {
    return metadata.logo
  }

  // If it's a relative path (PWA icons), prefix with production web URL
  const webUrl = URLS[app].web.production
  return `${webUrl}${metadata.logo}`
}
