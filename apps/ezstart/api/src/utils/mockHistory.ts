/**
 * Mock health check history data for development
 * Generates realistic uptime data for testing graphs
 */

interface MockHealthCheck {
  status: 'healthy' | 'unhealthy'
  responseTime: number | null
  timestamp: Date
}

/**
 * Generate mock health check history for a service
 * @param hours - Number of hours of history to generate
 * @param uptimePercentage - Target uptime percentage (0-100)
 * @param avgResponseTime - Average response time in ms
 * @returns Array of mock health checks
 */
export function generateMockHistory(
  hours: number = 24,
  uptimePercentage: number = 99,
  avgResponseTime: number = 150
): MockHealthCheck[] {
  const checks: MockHealthCheck[] = []
  const interval = 5 * 60 * 1000 // 5 minutes in ms
  const numChecks = Math.floor((hours * 60 * 60 * 1000) / interval)
  const now = Date.now()

  for (let i = 0; i < numChecks; i++) {
    const timestamp = new Date(now - (numChecks - i - 1) * interval)
    const isHealthy = Math.random() * 100 < uptimePercentage

    // Generate response time with variance, ensuring it's never negative
    const responseTime = isHealthy
      ? Math.max(1, Math.floor(avgResponseTime + (Math.random() - 0.5) * 100))
      : null

    checks.push({
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime,
      timestamp,
    })
  }

  return checks
}

/**
 * Get mock history for a specific service with realistic patterns
 */
export function getMockServiceHistory(serviceId: string, hours: number = 24) {
  // Different patterns for different service types
  const patterns: Record<string, { uptime: number; avgResponse: number }> = {
    // APIs - very high uptime, fast response
    'ezauth-api': { uptime: 99.9, avgResponse: 25 },
    'ezpay-api': { uptime: 99.8, avgResponse: 30 },
    'ezbill-api': { uptime: 99.5, avgResponse: 40 },
    'tower-defense-api': { uptime: 98.5, avgResponse: 50 },
    'green-pulse-api': { uptime: 99.0, avgResponse: 35 },

    // Web apps - high uptime, slower response (SSR)
    'ezstart-web': { uptime: 99.5, avgResponse: 800 },
    'ezauth-web': { uptime: 99.0, avgResponse: 1200 },
    'ezbill-web': { uptime: 98.8, avgResponse: 1500 },
    'ezpay-web': { uptime: 99.2, avgResponse: 900 },
    'tower-defense-web': { uptime: 98.0, avgResponse: 2000 },
    'fengshui-web': { uptime: 97.5, avgResponse: 1800 },
    'asc-tcd-web': { uptime: 98.5, avgResponse: 1600 },
    'green-pulse-web': { uptime: 99.0, avgResponse: 1400 },
  }

  const pattern = patterns[serviceId] || { uptime: 95.0, avgResponse: 500 }
  const history = generateMockHistory(hours, pattern.uptime, pattern.avgResponse)

  // Calculate actual stats
  const totalChecks = history.length
  const healthyChecks = history.filter(h => h.status === 'healthy').length
  const uptimePercentage = (healthyChecks / totalChecks) * 100
  const responseTimes = history
    .map(h => h.responseTime)
    .filter((rt): rt is number => rt !== null)
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length)
    : null

  return {
    serviceId,
    totalChecks,
    healthyChecks,
    uptimePercentage: Math.round(uptimePercentage * 10) / 10,
    avgResponseTime,
    history,
  }
}
