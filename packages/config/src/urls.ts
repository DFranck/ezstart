/**
 * Centralized URL configuration for all @ezstart apps
 *
 * Pattern:
 * - Local: localhost:6XXX
 * - Dev: [app].vercel.app (Vercel default)
 * - Prod: [app].ezstart.xyz OR custom domain
 *
 * APIs:
 * - Local: localhost:6XX0 (APIs end with 0)
 * - Prod: [app]-api.up.railway.app OR render
 */

export type Environment = 'local' | 'development' | 'production'
export type AppName =
  | 'ezstart'
  | 'ezauth'
  | 'ezbill'
  | 'ezpay'
  | 'fengshui'
  | 'asc-tcd'
  | 'green-pulse'
  | 'gacha-analyzer'

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
      local: 'http://localhost:6101',
      development: 'https://ezstart-web.vercel.app',
      production: 'https://www.ezstart.xyz',
    },
    api: {
      local: 'http://localhost:6100',
      production: 'https://ezstart-api.ezstart.xyz',
    },
  },

  ezauth: {
    web: {
      local: 'http://localhost:6111',
      development: 'https://ezstart-ezauth.vercel.app',
      production: 'https://ezauth.ezstart.xyz',
    },
    api: {
      local: 'http://localhost:6110',
      production: 'https://ezauth-api.ezstart.xyz',
    },
  },

  ezbill: {
    web: {
      local: 'http://localhost:6121',
      development: 'https://ezstart-ezbill.vercel.app',
      production: 'https://ezbill.ezstart.xyz',
    },
    api: {
      local: 'http://localhost:6120',
      production: 'https://ezbill-api.ezstart.xyz',
    },
  },

  ezpay: {
    web: {
      local: 'http://localhost:6131',
      development: 'https://ezstart-ezpay.vercel.app',
      production: 'https://ezpay.ezstart.xyz',
    },
    api: {
      local: 'http://localhost:6130',
      production: 'https://ezpay-api.up.railway.app',
    },
  },

  fengshui: {
    web: {
      local: 'http://localhost:6151',
      development: 'https://fengshui.vercel.app',
      production: 'https://ezfengshui.ezstart.xyz',
    },
  },

  'asc-tcd': {
    web: {
      local: 'http://localhost:6141',
      development: 'https://asc-tcd-web.vercel.app',
      production: 'https://www.asc-tcd.com',
    },
  },

  'green-pulse': {
    web: {
      local: 'http://localhost:6161',
      development: 'https://green-pulse-web.vercel.app',
      production: 'https://www.ai-greenpulse.com',
    },
    api: {
      local: 'http://localhost:6160',
      production: 'https://greenpulse-api.up.railway.app',
    },
  },

  'gacha-analyzer': {
    web: {
      local: 'http://localhost:6171',
      development: 'https://game-analyzer-web.vercel.app',
      production: 'https://game-analyzer.ezstart.xyz',
    },
    api: {
      local: 'http://localhost:6170',
      production: 'https://game-analyzer-api.up.railway.app',
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

  'gacha-analyzer': {
    name: 'Game Analyzer',
    description: 'Game screenshot scanner and stats analyzer (OCR)',
    emoji: '🎮',
    logo: '/icons/icon-192x192.png',
    githubPath: 'apps/gacha-analyzer',
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

  // Server-side: Not production = local development
  // @ts-ignore - window may not exist in Node.js context
  if (typeof process !== 'undefined' && typeof window === 'undefined') {
    return 'local'
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
      hostname === 'www.asc-tcd.com' ||
      hostname === 'game-analyzer.ezstart.xyz'
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
 * Configurable root domain for project domain checks.
 * Default: 'ezstart.xyz'
 */
let _rootDomain = 'ezstart.xyz'

/**
 * Set the root domain used by isProjectDomain / isEzstartDomain
 */
export function setRootDomain(domain: string): void {
  _rootDomain = domain
}

/**
 * Get the current root domain
 */
export function getRootDomain(): string {
  return _rootDomain
}

/**
 * Check if a hostname belongs to the project domain (configurable)
 *
 * @example
 * isProjectDomain('ezbill.ezstart.xyz') // true
 * isProjectDomain('app-externe.com') // false
 * isProjectDomain('localhost') // false
 */
export function isProjectDomain(hostname: string): boolean {
  return (
    hostname.endsWith(`.${_rootDomain}`) ||
    hostname === _rootDomain ||
    hostname === `www.${_rootDomain}`
  )
}

/**
 * Check if a hostname belongs to ezstart domain
 * Useful for auth mode validation
 *
 * @deprecated Use isProjectDomain() instead — same behavior, configurable via setRootDomain()
 *
 * @example
 * isEzstartDomain('ezbill.ezstart.xyz') // true
 * isEzstartDomain('app-externe.com') // false
 * isEzstartDomain('localhost') // false
 */
export function isEzstartDomain(hostname: string): boolean {
  return isProjectDomain(hostname)
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
 * Get canonical URL for SEO purposes (always returns production domain)
 * Use this for: robots.txt, sitemap.xml, og:url, canonical meta tags
 *
 * This ensures consistent SEO across all deployments (Vercel preview + custom domain)
 * by always pointing to the primary production domain.
 *
 * @example
 * ```typescript
 * // For SEO metadata
 * const canonicalUrl = getCanonicalUrl('ezstart', 'web')
 * // Returns: 'https://www.ezstart.xyz'
 *
 * // For API documentation
 * const apiCanonical = getCanonicalUrl('ezauth', 'api')
 * // Returns: 'https://ezauth-api.ezstart.xyz'
 * ```
 */
export function getCanonicalUrl(app: AppName, type: 'web' | 'api' = 'web'): string {
  if (type === 'api') {
    const apiUrls = URLS[app].api
    if (!apiUrls) {
      throw new Error(`App ${app} does not have an API`)
    }
    return apiUrls.production
  }

  return URLS[app].web.production
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
 * const port = getPort('ezstart', 'web') // 6101
 *
 * // API
 * const port = getPort('ezauth', 'api') // 6110
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

// ---------------------------------------------------------------------------
// Dynamic App Registry
// ---------------------------------------------------------------------------

/**
 * App config combining URLs and metadata
 */
export interface AppConfig {
  urls: AppUrls
  metadata: ProjectMetadata
}

type AppRegistry = Record<string, AppConfig>

// Build the default registry from existing constants
const _defaultRegistry: AppRegistry = Object.fromEntries(
  (Object.keys(URLS) as AppName[]).map(app => [
    app,
    { urls: URLS[app], metadata: PROJECT_METADATA[app] },
  ])
)

let _registry: AppRegistry = { ..._defaultRegistry }

/**
 * Get the full app registry (all registered apps with their URLs and metadata)
 */
export function getRegistry(): AppRegistry {
  return _registry
}

/**
 * Register a new app or override an existing one in the registry.
 * This extends the registry without modifying the hardcoded URLS/PROJECT_METADATA constants.
 *
 * @example
 * ```typescript
 * registerApp('my-new-app', {
 *   urls: { web: { local: 'http://localhost:6000', development: '...', production: '...' } },
 *   metadata: { name: 'My App', description: '...', emoji: '🆕', githubPath: 'apps/my-new-app' }
 * })
 * ```
 */
export function registerApp(name: string, config: AppConfig): void {
  _registry = { ..._registry, [name]: config }
}

/**
 * Reset the registry to defaults (useful for testing)
 */
export function resetRegistry(): void {
  _registry = { ..._defaultRegistry }
}
