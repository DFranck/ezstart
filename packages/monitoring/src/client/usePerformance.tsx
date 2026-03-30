'use client'

import { logger } from '@ezstart/logger'
import { useEffect, useCallback } from 'react'

interface PerformanceMetricOptions {
  serviceId: string
  apiUrl?: string
  enabled?: boolean
}

interface PerformanceMetric {
  serviceId: string
  metricType: 'api_response_time' | 'page_load' | 'external_api'
  endpoint?: string
  duration: number
  status: 'success' | 'error'
  metadata?: Record<string, any>
}

/**
 * Hook to track client-side performance metrics
 *
 * @example
 * ```tsx
 * const perf = usePerformance({
 *   serviceId: 'ezauth-web',
 *   apiUrl: 'https://monitoring.ezstart.xyz',
 * })
 *
 * // Track API call
 * const start = Date.now()
 * const response = await fetch('/api/login')
 * perf.track({
 *   metricType: 'api_response_time',
 *   endpoint: '/api/login',
 *   duration: Date.now() - start,
 *   status: response.ok ? 'success' : 'error',
 * })
 * ```
 */
export function usePerformance({
  serviceId,
  apiUrl = 'https://monitoring.ezstart.xyz',
  enabled = true,
}: PerformanceMetricOptions) {
  // Track page load performance on mount
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    // Wait for page load to complete
    if (document.readyState === 'complete') {
      trackPageLoad()
    } else {
      window.addEventListener('load', trackPageLoad)
      return () => window.removeEventListener('load', trackPageLoad)
    }

    function trackPageLoad() {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming

      if (navigation) {
        const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart

        sendMetric({
          serviceId,
          metricType: 'page_load',
          endpoint: window.location.pathname,
          duration: Math.round(pageLoadTime),
          status: 'success',
          metadata: {
            domContentLoaded: Math.round(
              navigation.domContentLoadedEventEnd - navigation.fetchStart
            ),
            domInteractive: Math.round(navigation.domInteractive - navigation.fetchStart),
          },
        })
      }
    }
  }, [serviceId, enabled])

  /**
   * Track a custom performance metric
   */
  const track = useCallback(
    (metric: Omit<PerformanceMetric, 'serviceId'>) => {
      if (!enabled) return

      sendMetric({
        serviceId,
        ...metric,
      })
    },
    [serviceId, enabled]
  )

  /**
   * Send metric to monitoring API
   */
  const sendMetric = async (metric: PerformanceMetric) => {
    try {
      await fetch(`${apiUrl}/api/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
        // Don't block the main thread
        keepalive: true,
      })
    } catch (error) {
      // Silently fail - don't break the app if monitoring is down
      logger.warn(
        '[Performance] Failed to send metric:',
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  return {
    track,
  }
}

/**
 * Utility function to wrap async functions with performance tracking
 *
 * @example
 * ```tsx
 * const fetchData = withPerformanceTracking(
 *   async () => {
 *     return await fetch('/api/data').then(r => r.json())
 *   },
 *   {
 *     serviceId: 'ezauth-web',
 *     endpoint: '/api/data',
 *     metricType: 'api_response_time',
 *   }
 * )
 * ```
 */
export function withPerformanceTracking<T>(
  fn: () => Promise<T>,
  options: {
    serviceId: string
    endpoint: string
    metricType: 'api_response_time' | 'external_api'
    apiUrl?: string
  }
): () => Promise<T> {
  return async () => {
    const start = Date.now()
    let status: 'success' | 'error' = 'success'
    let errorMessage: string | undefined

    try {
      const result = await fn()
      return result
    } catch (error) {
      status = 'error'
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw error
    } finally {
      const duration = Date.now() - start

      // Send metric
      fetch(`${options.apiUrl || 'https://monitoring.ezstart.xyz'}/api/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: options.serviceId,
          metricType: options.metricType,
          endpoint: options.endpoint,
          duration,
          status,
          metadata: errorMessage ? { errorMessage } : undefined,
        }),
        keepalive: true,
      }).catch(() => {
        // Silently fail
      })
    }
  }
}
