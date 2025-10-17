/**
 * Types for health check system
 */

import { URLS } from '@ezstart/config'

export type ServiceType = 'api' | 'web' | 'database' | 'external'

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

export interface HealthCheckConfig {
  name: string
  type: ServiceType
  url: string
  timeout: number // ms
  interval: number // ms
  retries: number
  expectedStatus?: number
  headers?: Record<string, string>
}

export interface HealthCheckResult {
  name: string
  type: ServiceType
  status: HealthStatus
  responseTime: number | null // ms
  timestamp: Date
  error: string | null
  metadata?: Record<string, unknown>
}

export interface ServiceHealth {
  service: string
  type: ServiceType
  status: HealthStatus
  uptime: number // percentage
  avgResponseTime: number // ms
  lastCheck: Date
  lastHealthy: Date | null
  lastUnhealthy: Date | null
  checks: HealthCheckResult[]
}

/**
 * Monitored services - Auto-generated from @ezstart/config
 * Single source of truth for all service URLs and ports
 */
export const MONITORED_SERVICES = {
  // APIs - All have /api/health endpoint
  'ezauth-api': {
    name: 'EZAuth API',
    type: 'api' as ServiceType,
    localUrl: `${URLS.ezauth.api?.local}/api/health`,
    productionUrl: `${URLS.ezauth.api?.production}/api/health`,
    port: new URL(URLS.ezauth.api!.local).port,
  },
  'ezpay-api': {
    name: 'EZPay API',
    type: 'api' as ServiceType,
    localUrl: `${URLS.ezpay.api?.local}/api/health`,
    productionUrl: `${URLS.ezpay.api?.production}/api/health`,
    port: new URL(URLS.ezpay.api!.local).port,
  },
  'ezbill-api': {
    name: 'EZBill API',
    type: 'api' as ServiceType,
    localUrl: `${URLS.ezbill.api?.local}/api/health`,
    productionUrl: `${URLS.ezbill.api?.production}/api/health`,
    port: new URL(URLS.ezbill.api!.local).port,
  },
  'tower-defense-api': {
    name: 'Tower Defense API',
    type: 'api' as ServiceType,
    localUrl: `${URLS['tower-defense'].api?.local}/api/health`,
    productionUrl: `${URLS['tower-defense'].api?.production}/api/health`,
    port: new URL(URLS['tower-defense'].api!.local).port,
  },
  'green-pulse-api': {
    name: 'GreenPulse API',
    type: 'api' as ServiceType,
    localUrl: `${URLS['green-pulse'].api?.local}/api/health`,
    productionUrl: `${URLS['green-pulse'].api?.production}/api/health`,
    port: new URL(URLS['green-pulse'].api!.local).port,
  },

  // Web Apps - Root URL health check
  'ezstart-web': {
    name: 'EZStart',
    type: 'web' as ServiceType,
    localUrl: URLS.ezstart.web.local,
    productionUrl: URLS.ezstart.web.production,
    port: new URL(URLS.ezstart.web.local).port,
  },
  'ezauth-web': {
    name: 'EZAuth',
    type: 'web' as ServiceType,
    localUrl: URLS.ezauth.web.local,
    productionUrl: URLS.ezauth.web.production,
    port: new URL(URLS.ezauth.web.local).port,
  },
  'ezbill-web': {
    name: 'EZBill',
    type: 'web' as ServiceType,
    localUrl: URLS.ezbill.web.local,
    productionUrl: URLS.ezbill.web.production,
    port: new URL(URLS.ezbill.web.local).port,
  },
  'ezpay-web': {
    name: 'EZPay',
    type: 'web' as ServiceType,
    localUrl: URLS.ezpay.web.local,
    productionUrl: URLS.ezpay.web.production,
    port: new URL(URLS.ezpay.web.local).port,
  },
  'tower-defense-web': {
    name: 'Tower Defense',
    type: 'web' as ServiceType,
    localUrl: URLS['tower-defense'].web.local,
    productionUrl: URLS['tower-defense'].web.production,
    port: new URL(URLS['tower-defense'].web.local).port,
  },
  'fengshui-web': {
    name: 'FengShui',
    type: 'web' as ServiceType,
    localUrl: URLS.fengshui.web.local,
    productionUrl: URLS.fengshui.web.production,
    port: new URL(URLS.fengshui.web.local).port,
  },
  'asc-tcd-web': {
    name: 'ASC-TCD',
    type: 'web' as ServiceType,
    localUrl: URLS['asc-tcd'].web.local,
    productionUrl: URLS['asc-tcd'].web.production,
    port: new URL(URLS['asc-tcd'].web.local).port,
  },
  'green-pulse-web': {
    name: 'GreenPulse',
    type: 'web' as ServiceType,
    localUrl: URLS['green-pulse'].web.local,
    productionUrl: URLS['green-pulse'].web.production,
    port: new URL(URLS['green-pulse'].web.local).port,
  },
} as const

export type MonitoredServiceId = keyof typeof MONITORED_SERVICES

/**
 * Get URLs to check based on environment
 * - Development: Check ONLY local URLs (don't consume production resources)
 * - Production: Check ONLY production URLs
 */
export function getUrlsToCheck(
  serviceId: MonitoredServiceId,
  environment: 'development' | 'production' = 'development'
): Array<{ url: string; label: string }> {
  const config = MONITORED_SERVICES[serviceId]

  if (environment === 'production') {
    // Production: Only check production URLs
    return [{ url: config.productionUrl, label: 'production' }]
  }

  // Development: Only check local URLs
  return [{ url: config.localUrl, label: 'local' }]
}
