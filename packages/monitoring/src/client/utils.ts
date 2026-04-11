/**
 * Client-side monitoring utility functions
 *
 * Pure functions for computing health scores and metrics from monitoring data.
 * No data fetching — accepts data as arguments.
 */

export interface HealthSummary {
  total: number
  healthy: number
  degraded: number
  unhealthy: number
}

export type HealthGrade = 'excellent' | 'good' | 'fair' | 'poor' | 'critical'

export interface HealthScore {
  score: number
  status: HealthGrade
}

interface AuditLike {
  score?: number | null
  name?: string
}

interface ProjectLike {
  avgResponseTime?: number | null
}

interface ErrorLike {
  timestamp: string
  severity: 'critical' | 'error' | 'warning' | 'info'
  project?: string
}

function gradeFromScore(score: number): HealthGrade {
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'fair'
  if (score >= 30) return 'poor'
  return 'critical'
}

export function calculateOverallHealth(summary: HealthSummary): HealthScore {
  const { total, healthy } = summary
  if (total === 0) return { score: 0, status: 'critical' }

  const score = Math.round((healthy / total) * 100)
  return { score, status: gradeFromScore(score) }
}

export function calculateAuditsHealth(audits: AuditLike[]): HealthScore {
  const auditsGlobalScore =
    audits.length > 0
      ? Math.round(audits.reduce((acc: number, a) => acc + (a.score || 0), 0) / audits.length)
      : 0

  return { score: auditsGlobalScore, status: gradeFromScore(auditsGlobalScore) }
}

export function calculateErrorsHealth(errors: ErrorLike[]): HealthScore {
  const now = new Date().getTime()
  const last24h = 24 * 60 * 60 * 1000

  const recentErrors = errors.filter(e => {
    const errorTime = new Date(e.timestamp).getTime()
    return now - errorTime <= last24h
  })

  const criticalCount = recentErrors.filter(e => e.severity === 'critical').length
  const errorCount = recentErrors.filter(e => e.severity === 'error').length
  const warningCount = recentErrors.filter(e => e.severity === 'warning').length

  const penaltyScore = criticalCount * 10 + errorCount * 5 + warningCount * 1

  let score = 100
  if (penaltyScore > 0) {
    score = Math.max(0, 100 - penaltyScore * 2)
  }

  return { score, status: gradeFromScore(score) }
}

export interface MetricsData {
  servicesHealthy: number
  servicesTotal: number
  auditsComplete: number
  auditsTotal: number
  deploymentsActive: number
  deploymentsTotal: number
  avgResponseTime: number
  worstAuditName?: string
  worstProjectName?: string
}

export function getMetricsData(
  activeTab: 'projects' | 'audits' | 'errors',
  summary: HealthSummary,
  audits: AuditLike[],
  projects: ProjectLike[],
  errors: ErrorLike[] = []
): MetricsData {
  if (activeTab === 'projects') {
    return {
      servicesHealthy: summary.healthy,
      servicesTotal: summary.total,
      auditsComplete: audits.filter(a => a.score !== null && a.score !== undefined).length,
      auditsTotal: audits.length,
      deploymentsActive: summary.healthy,
      deploymentsTotal: summary.total,
      avgResponseTime:
        projects.length > 0
          ? Math.round(
              projects
                .filter(p => p.avgResponseTime !== null)
                .reduce((acc: number, p) => acc + (p.avgResponseTime || 0), 0) /
                projects.filter(p => p.avgResponseTime !== null).length
            )
          : 0,
    }
  }

  if (activeTab === 'audits') {
    const worstAudit =
      audits.length > 0
        ? audits.reduce((worst, current) =>
            (current.score || 0) < (worst.score || 0) ? current : worst
          )
        : null

    return {
      servicesHealthy: audits.filter(a => (a.score ?? 0) >= 90).length,
      servicesTotal: audits.length,
      auditsComplete: audits.filter(a => a.score !== null && a.score !== undefined).length,
      auditsTotal: audits.length,
      deploymentsActive: audits.filter(a => (a.score ?? 0) >= 90).length,
      deploymentsTotal: audits.length,
      avgResponseTime: worstAudit?.score ?? 0,
      worstAuditName: worstAudit?.name ?? '',
    }
  }

  // Errors tab
  const errorsByProject: Record<string, number> = {}
  errors.forEach(error => {
    const project = error.project || 'Unknown'
    errorsByProject[project] = (errorsByProject[project] || 0) + 1
  })

  const worstProject = Object.entries(errorsByProject).reduce(
    (worst, [project, count]) => {
      if (count > worst.count) return { project, count }
      return worst
    },
    { project: 'None', count: 0 }
  )

  return {
    servicesHealthy: errors.length,
    servicesTotal:
      errors.filter(e => e.severity === 'critical').length +
      errors.filter(e => e.severity === 'error').length,
    auditsComplete: 0,
    auditsTotal: 0,
    deploymentsActive: worstProject.count,
    deploymentsTotal: 0,
    avgResponseTime: 0,
    worstProjectName: worstProject.project,
  }
}
