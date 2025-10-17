/**
 * Utilities for scoring and calculating health metrics
 */

import type { AuditStatus, HealthStatus } from '../types'

/**
 * Convert audit score to status
 */
export function scoreToStatus(score: number | null): AuditStatus {
  if (score === null) return 'not-audited'
  if (score >= 90) return 'complete'
  if (score >= 70) return 'partial'
  if (score >= 50) return 'partial'
  return 'not-audited'
}

/**
 * Get emoji for score
 */
export function getScoreEmoji(score: number | null): string {
  if (score === null) return '🔴'
  if (score >= 90) return '🟢'
  if (score >= 70) return '🟡'
  if (score >= 50) return '🟠'
  return '🔴'
}

/**
 * Get status text for score
 */
export function getScoreStatusText(score: number | null): string {
  if (score === null) return 'Not Audited'
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Poor'
}

/**
 * Calculate overall health score from multiple metrics
 */
export function calculateOverallHealthScore(metrics: {
  servicesHealthy: number
  servicesTotal: number
  auditsComplete: number
  auditsTotal: number
  deploymentsActive: number
  deploymentsTotal: number
  databasesConnected: number
  databasesTotal: number
}): number {
  const weights = {
    services: 0.3,
    audits: 0.3,
    deployments: 0.2,
    databases: 0.2,
  }

  const servicesScore =
    metrics.servicesTotal > 0 ? (metrics.servicesHealthy / metrics.servicesTotal) * 100 : 100

  const auditsScore =
    metrics.auditsTotal > 0 ? (metrics.auditsComplete / metrics.auditsTotal) * 100 : 0

  const deploymentsScore =
    metrics.deploymentsTotal > 0 ? (metrics.deploymentsActive / metrics.deploymentsTotal) * 100 : 100

  const databasesScore =
    metrics.databasesTotal > 0 ? (metrics.databasesConnected / metrics.databasesTotal) * 100 : 100

  const weightedScore =
    servicesScore * weights.services +
    auditsScore * weights.audits +
    deploymentsScore * weights.deployments +
    databasesScore * weights.databases

  return Math.round(weightedScore)
}

/**
 * Get overall health status from score
 */
export function getOverallHealthStatus(
  score: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'fair'
  return 'poor'
}

/**
 * Calculate uptime percentage
 */
export function calculateUptime(
  healthyChecks: number,
  totalChecks: number
): number {
  if (totalChecks === 0) return 0
  return Math.round((healthyChecks / totalChecks) * 100 * 100) / 100
}

/**
 * Determine if audit is overdue
 */
export function isAuditOverdue(
  lastUpdated: Date | null,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'as-needed'
): boolean {
  if (!lastUpdated) return true
  if (frequency === 'as-needed') return false

  const now = new Date()
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24))

  switch (frequency) {
    case 'weekly':
      return daysSinceUpdate > 7
    case 'monthly':
      return daysSinceUpdate > 30
    case 'quarterly':
      return daysSinceUpdate > 90
    default:
      return false
  }
}

/**
 * Calculate next due date for audit
 */
export function calculateNextDueDate(
  lastUpdated: Date | null,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'as-needed'
): Date | null {
  if (!lastUpdated || frequency === 'as-needed') return null

  const nextDue = new Date(lastUpdated)

  switch (frequency) {
    case 'weekly':
      nextDue.setDate(nextDue.getDate() + 7)
      break
    case 'monthly':
      nextDue.setMonth(nextDue.getMonth() + 1)
      break
    case 'quarterly':
      nextDue.setMonth(nextDue.getMonth() + 3)
      break
  }

  return nextDue
}

/**
 * Convert health check response time to status
 */
export function responseTimeToHealthStatus(
  responseTime: number | null,
  timeout: number
): HealthStatus {
  if (responseTime === null) return 'unknown'
  if (responseTime < timeout * 0.5) return 'healthy'
  if (responseTime < timeout * 0.8) return 'degraded'
  return 'unhealthy'
}
