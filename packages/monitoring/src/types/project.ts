/**
 * Project-based monitoring types
 * Groups multiple services/URLs under a single project
 */

import type { HealthStatus } from './health'

export type ProjectId =
  | 'ezstart'
  | 'ezauth'
  | 'ezbill'
  | 'ezpay'
  | 'tower-defense'
  | 'fengshui'
  | 'asc-tcd'
  | 'green-pulse'

export type EndpointType = 'api' | 'web'

export interface ProjectEndpoint {
  type: EndpointType
  label: string // "API", "Web App", "Swagger Docs", etc.
  url: string
  platform?: 'railway' | 'render' | 'vercel' | 'custom'
  status: HealthStatus
  responseTime: number | null
  error: string | null
  lastCheck: Date
  // API-specific metadata
  metadata?: {
    endpointsCount?: number // Number of API endpoints
    swaggerUrl?: string // OpenAPI/Swagger docs URL
  }
}

export interface ProjectHealth {
  id: ProjectId
  name: string
  description?: string
  emoji?: string
  logo?: string // Path to logo image (optional, fallback to emoji)
  githubUrl?: string // GitHub repository URL
  endpoints: ProjectEndpoint[]
  overallStatus: HealthStatus
  healthyCount: number
  totalCount: number
  avgResponseTime: number | null
  lastCheck: Date
}

/**
 * Project configuration with all endpoints
 */
export const PROJECT_ENDPOINTS: Record<
  ProjectId,
  {
    name: string
    emoji: string
    logo?: string // Optional logo path (fallback to emoji if not provided)
    description: string
    githubUrl?: string // GitHub repository URL
    endpoints: Array<{
      type: EndpointType
      label: string
      getUrl: (env: 'local' | 'production') => string
      platform?: 'railway' | 'render' | 'vercel'
      // API-specific config
      endpointsCount?: number // Number of API endpoints (for APIs only)
      getSwaggerUrl?: (env: 'local' | 'production') => string // Swagger docs URL
    }>
  }
> = {
  ezauth: {
    name: 'EZAuth',
    emoji: '🔐',
    description: 'Centralized authentication service (SSO)',
    githubUrl: 'https://github.com/DFranck/ezstart/tree/master/apps/ezauth',
    endpoints: [
      {
        type: 'api',
        label: 'API',
        getUrl: env => (env === 'local' ? 'http://localhost:5010/api/health' : 'https://ezauth.up.railway.app/api/health'),
        platform: 'railway',
        endpointsCount: 8,
        getSwaggerUrl: env => (env === 'local' ? 'http://localhost:5010/docs' : 'https://ezauth.up.railway.app/docs'),
      },
      {
        type: 'web',
        label: 'Web',
        getUrl: env => (env === 'local' ? 'http://localhost:5015' : 'https://ezauth.ezstart.xyz'),
        platform: 'vercel',
      },
    ],
  },

  ezbill: {
    name: 'EZBill',
    emoji: '💼',
    description: 'Invoicing and billing management',
    githubUrl: 'https://github.com/DFranck/ezstart/tree/master/apps/ezbill',
    endpoints: [
      {
        type: 'api',
        label: 'API',
        getUrl: env => (env === 'local' ? 'http://localhost:5020/api/health' : 'https://ezbill.onrender.com/api/health'),
        platform: 'render',
        endpointsCount: 49,
        getSwaggerUrl: env => (env === 'local' ? 'http://localhost:5020/docs' : 'https://ezbill.onrender.com/docs'),
      },
      {
        type: 'web',
        label: 'Web',
        getUrl: env => (env === 'local' ? 'http://localhost:5025' : 'https://ezbill.ezstart.xyz'),
        platform: 'vercel',
      },
    ],
  },

  ezpay: {
    name: 'EZPay',
    emoji: '💳',
    description: 'Universal payment processing',
    githubUrl: 'https://github.com/DFranck/ezstart/tree/master/apps/ezpay',
    endpoints: [
      {
        type: 'api',
        label: 'API',
        getUrl: env => (env === 'local' ? 'http://localhost:5040/api/health' : 'https://ezpay-api.up.railway.app/api/health'),
        platform: 'railway',
        endpointsCount: 6,
        getSwaggerUrl: env => (env === 'local' ? 'http://localhost:5040/docs' : 'https://ezpay-api.up.railway.app/docs'),
      },
      {
        type: 'web',
        label: 'Web',
        getUrl: env => (env === 'local' ? 'http://localhost:5045' : 'https://ezpay.ezstart.xyz'),
        platform: 'vercel',
      },
    ],
  },

  'tower-defense': {
    name: 'Tower Defense',
    emoji: '🏰',
    logo: 'https://tower-defense.ezstart.xyz/icons/icon-192x192.png', // PWA icon from production
    description: 'Multiplayer tower defense game',
    githubUrl: 'https://github.com/DFranck/ezstart/tree/master/apps/tower-defense',
    endpoints: [
      {
        type: 'api',
        label: 'API',
        getUrl: env => (env === 'local' ? 'http://localhost:5030/api/health' : 'https://tower-defense-api.up.railway.app/api/health'),
        platform: 'railway',
        endpointsCount: 7,
        getSwaggerUrl: env => (env === 'local' ? 'http://localhost:5030/docs' : 'https://tower-defense-api.up.railway.app/docs'),
      },
      {
        type: 'web',
        label: 'Web',
        getUrl: env => (env === 'local' ? 'http://localhost:5035' : 'https://tower-defense.ezstart.xyz'),
        platform: 'vercel',
      },
    ],
  },

  'green-pulse': {
    name: 'GreenPulse',
    emoji: '🌱',
    description: 'AI-powered environmental impact tracker',
    githubUrl: 'https://github.com/DFranck/ezstart/tree/master/apps/green-pulse',
    endpoints: [
      {
        type: 'api',
        label: 'API',
        getUrl: env => (env === 'local' ? 'http://localhost:5070/api/health' : 'https://green-pulse-api.up.railway.app/api/health'),
        platform: 'railway',
        endpointsCount: 2,
        getSwaggerUrl: env => (env === 'local' ? 'http://localhost:5070/docs' : 'https://green-pulse-api.up.railway.app/docs'),
      },
      {
        type: 'web',
        label: 'Web',
        getUrl: env => (env === 'local' ? 'http://localhost:5075' : 'https://www.ai-greenpulse.com'),
        platform: 'vercel',
      },
    ],
  },

  ezstart: {
    name: 'EZStart',
    emoji: '🚀',
    logo: 'https://www.ezstart.xyz/icons/icon-192x192.png', // PWA icon from production
    description: 'Main landing page and dashboard',
    githubUrl: 'https://github.com/DFranck/ezstart/tree/master/apps/ezstart',
    endpoints: [
      {
        type: 'web',
        label: 'Web',
        getUrl: env => (env === 'local' ? 'http://localhost:5050' : 'https://www.ezstart.xyz'),
        platform: 'vercel',
      },
    ],
  },

  fengshui: {
    name: 'FengShui',
    emoji: '🎋',
    description: 'Feng Shui consultation platform',
    githubUrl: 'https://github.com/DFranck/ezstart/tree/master/apps/fengshui',
    endpoints: [
      {
        type: 'web',
        label: 'Web',
        getUrl: env => (env === 'local' ? 'http://localhost:5065' : 'https://ezfengshui.ezstart.xyz'),
        platform: 'vercel',
      },
    ],
  },

  'asc-tcd': {
    name: 'ASC-TCD',
    emoji: '🎓',
    logo: 'https://www.asc-tcd.com/images/logo.png', // Logo from production domain
    description: 'Academic student center',
    githubUrl: 'https://github.com/DFranck/ezstart/tree/master/apps/asc-tcd',
    endpoints: [
      {
        type: 'web',
        label: 'Web',
        getUrl: env => (env === 'local' ? 'http://localhost:5055' : 'https://www.asc-tcd.com'),
        platform: 'vercel',
      },
    ],
  },
}
