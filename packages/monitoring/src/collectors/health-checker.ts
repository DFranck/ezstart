/**
 * Health check collector
 * Performs health checks on services and returns results
 */

import type {
  HealthCheckConfig,
  HealthCheckResult,
  HealthStatus,
  MonitoredServiceId,
} from '../types'
import { MONITORED_SERVICES, getUrlsToCheck } from '../types'

export class HealthChecker {
  private results: Map<string, HealthCheckResult[]> = new Map()

  /**
   * Perform a single health check
   */
  async check(config: HealthCheckConfig): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout)

      const response = await fetch(config.url, {
        signal: controller.signal,
        headers: config.headers,
        method: 'GET',
      })

      clearTimeout(timeoutId)

      const responseTime = Date.now() - startTime
      const isHealthy = config.expectedStatus
        ? response.status === config.expectedStatus
        : response.ok

      const result: HealthCheckResult = {
        name: config.name,
        type: config.type,
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: new Date(),
        error: null,
        metadata: {
          statusCode: response.status,
          statusText: response.statusText,
        },
      }

      this.storeResult(config.name, result)
      return result
    } catch (error) {
      const responseTime = Date.now() - startTime

      let status: HealthStatus = 'unhealthy'
      let errorMessage = 'Unknown error'

      if (error instanceof Error) {
        errorMessage = error.message
        if (error.name === 'AbortError') {
          errorMessage = `Timeout after ${config.timeout}ms`
          status = 'unhealthy'
        }
      }

      const result: HealthCheckResult = {
        name: config.name,
        type: config.type,
        status,
        responseTime: responseTime > config.timeout ? null : responseTime,
        timestamp: new Date(),
        error: errorMessage,
      }

      this.storeResult(config.name, result)
      return result
    }
  }

  /**
   * Perform health checks with retries
   */
  async checkWithRetries(config: HealthCheckConfig): Promise<HealthCheckResult> {
    let lastResult: HealthCheckResult | null = null

    for (let attempt = 0; attempt <= config.retries; attempt++) {
      lastResult = await this.check(config)

      if (lastResult.status === 'healthy') {
        return lastResult
      }

      // Wait before retry (exponential backoff)
      if (attempt < config.retries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    return lastResult!
  }

  /**
   * Store health check result in history
   */
  private storeResult(name: string, result: HealthCheckResult): void {
    const existing = this.results.get(name) || []
    const maxHistory = 100 // Keep last 100 checks

    existing.unshift(result)
    if (existing.length > maxHistory) {
      existing.pop()
    }

    this.results.set(name, existing)
  }

  /**
   * Get health check history for a service
   */
  getHistory(name: string, limit = 10): HealthCheckResult[] {
    const history = this.results.get(name) || []
    return history.slice(0, limit)
  }

  /**
   * Calculate uptime percentage
   */
  calculateUptime(name: string, hours = 24): number {
    const history = this.results.get(name) || []
    if (history.length === 0) return 0

    // Filter results within the time window
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000
    const recentResults = history.filter(r => r.timestamp.getTime() >= cutoffTime)

    if (recentResults.length === 0) return 0

    const healthyCount = recentResults.filter(r => r.status === 'healthy').length
    return (healthyCount / recentResults.length) * 100
  }

  /**
   * Get average response time
   */
  getAverageResponseTime(name: string, limit = 10): number | null {
    const history = this.getHistory(name, limit)
    const validResults = history.filter(r => r.responseTime !== null)

    if (validResults.length === 0) return null

    const sum = validResults.reduce((acc, r) => acc + (r.responseTime || 0), 0)
    return Math.round(sum / validResults.length)
  }

  /**
   * Clear history for a service
   */
  clearHistory(name: string): void {
    this.results.delete(name)
  }

  /**
   * Clear all history
   */
  clearAllHistory(): void {
    this.results.clear()
  }

  /**
   * Check all URLs for a service based on environment
   * - Development: Check ONLY local URLs
   * - Production: Check ALL production URLs (Railway + Render + Vercel)
   */
  async checkAllEnvironments(
    serviceId: MonitoredServiceId,
    environment: 'development' | 'production' = 'development',
    options?: {
      timeout?: number
      retries?: number
    }
  ): Promise<HealthCheckResult[]> {
    const config = MONITORED_SERVICES[serviceId]
    const urlsToCheck = getUrlsToCheck(serviceId, environment)

    const results = await Promise.all(
      urlsToCheck.map(async ({ url, label }) => {
        const checkConfig: HealthCheckConfig = {
          name: `${config.name} (${label})`,
          type: config.type,
          url,
          timeout: options?.timeout || 5000,
          interval: 30000,
          retries: options?.retries || 3,
        }

        return options?.retries
          ? await this.checkWithRetries(checkConfig)
          : await this.check(checkConfig)
      })
    )

    return results
  }
}
