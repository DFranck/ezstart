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
 * Project configuration type
 * The actual configuration is now dynamically generated in utils/project-config.ts
 * from @ezstart/config (single source of truth)
 */
export type ProjectConfig = {
  name: string
  emoji: string
  logo?: string
  description: string
  githubUrl: string
  endpoints: Array<{
    type: EndpointType
    label: string
    getUrl: (env: 'local' | 'production') => string
    platform?: 'railway' | 'render' | 'vercel' | 'custom'
    endpointsCount?: number
    getSwaggerUrl?: (env: 'local' | 'production') => string
  }>
}

/**
 * @deprecated - Hardcoded configuration removed
 * Use PROJECT_ENDPOINTS from utils/project-config.ts instead
 * All project configuration is now dynamically generated from @ezstart/config
 */
