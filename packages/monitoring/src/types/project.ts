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
  | 'monitoring'

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
}

export interface ProjectHealth {
  id: ProjectId
  name: string
  description?: string
  emoji?: string
  logo?: string // Path to logo image (optional, fallback to emoji)
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
    endpoints: Array<{
      type: EndpointType
      label: string
      getUrl: (env: 'local' | 'production') => string
      platform?: 'railway' | 'render' | 'vercel'
    }>
  }
> = {
  ezauth: {
    name: 'EZAuth',
    emoji: '🔐',
    description: 'Centralized authentication service (SSO)',
    endpoints: [
      {
        type: 'api',
        label: 'API',
        getUrl: env => (env === 'local' ? 'http://localhost:5010/api/health' : 'https://ezauth.up.railway.app/api/health'),
        platform: 'railway',
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
    endpoints: [
      {
        type: 'api',
        label: 'API',
        getUrl: env => (env === 'local' ? 'http://localhost:5020/api/health' : 'https://ezbill.onrender.com/api/health'),
        platform: 'render',
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
    endpoints: [
      {
        type: 'api',
        label: 'API',
        getUrl: env => (env === 'local' ? 'http://localhost:5040/api/health' : 'https://ezpay-api.up.railway.app/api/health'),
        platform: 'railway',
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
    description: 'Multiplayer tower defense game',
    endpoints: [
      {
        type: 'api',
        label: 'API',
        getUrl: env => (env === 'local' ? 'http://localhost:5030/api/health' : 'https://tower-defense-api.up.railway.app/api/health'),
        platform: 'railway',
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
    endpoints: [
      {
        type: 'api',
        label: 'API',
        getUrl: env => (env === 'local' ? 'http://localhost:5070/api/health' : 'https://green-pulse-api.up.railway.app/api/health'),
        platform: 'railway',
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
    description: 'Main landing page and dashboard',
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
    endpoints: [
      {
        type: 'web',
        label: 'Web',
        getUrl: env => (env === 'local' ? 'http://localhost:5055' : 'https://www.asc-tcd.com'),
        platform: 'vercel',
      },
    ],
  },

  monitoring: {
    name: 'Monitoring',
    emoji: '📊',
    description: 'Central monitoring and observability hub for the monorepo',
    endpoints: [
      {
        type: 'api',
        label: 'API',
        getUrl: env => (env === 'local' ? 'http://localhost:5080/api/health' : 'https://monitoring.ezstart.xyz/api/health'),
        platform: 'railway',
      },
    ],
  },
}
