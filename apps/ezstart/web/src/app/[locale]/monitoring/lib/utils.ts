import type { ProjectsData } from '../hooks'

export function calculateOverallHealth(summary: ProjectsData['summary']) {
  const { total, healthy } = summary
  if (total === 0) return { score: 0, status: 'critical' as const }

  const score = Math.round((healthy / total) * 100)

  let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  if (score >= 90) status = 'excellent'
  else if (score >= 70) status = 'good'
  else if (score >= 50) status = 'fair'
  else if (score >= 30) status = 'poor'
  else status = 'critical'

  return { score, status }
}

export function calculateAuditsHealth(audits: any[]) {
  const auditsGlobalScore =
    audits.length > 0
      ? Math.round(audits.reduce((acc: number, a: any) => acc + (a.score || 0), 0) / audits.length)
      : 0

  let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  if (auditsGlobalScore >= 90) status = 'excellent'
  else if (auditsGlobalScore >= 70) status = 'good'
  else if (auditsGlobalScore >= 50) status = 'fair'
  else if (auditsGlobalScore >= 30) status = 'poor'
  else status = 'critical'

  return { score: auditsGlobalScore, status }
}

export function calculateErrorsHealth(errors: any[]) {
  // Score inversé: moins d'erreurs = meilleur score
  // Pondération par sévérité: critical = 10 points, error = 5, warning = 1

  const criticalCount = errors.filter((e: any) => e.severity === 'critical').length
  const errorCount = errors.filter((e: any) => e.severity === 'error').length
  const warningCount = errors.filter((e: any) => e.severity === 'warning').length

  // Score de pénalité (plus c'est haut, plus c'est grave)
  const penaltyScore = (criticalCount * 10) + (errorCount * 5) + (warningCount * 1)

  // Convertir en score sur 100 (100 = parfait, 0 = catastrophique)
  // Si penaltyScore = 0 → 100
  // Si penaltyScore >= 50 → 0
  let score = 100
  if (penaltyScore > 0) {
    score = Math.max(0, 100 - penaltyScore * 2)
  }

  let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  if (score >= 90) status = 'excellent'
  else if (score >= 70) status = 'good'
  else if (score >= 50) status = 'fair'
  else if (score >= 30) status = 'poor'
  else status = 'critical'

  return { score, status }
}

export function getMetricsData(
  activeTab: 'projects' | 'audits' | 'errors',
  summary: ProjectsData['summary'],
  audits: any[],
  projects: any[],
  errors: any[] = []
) {
  if (activeTab === 'projects') {
    return {
      servicesHealthy: summary.healthy,
      servicesTotal: summary.total,
      auditsComplete: audits.filter((a: any) => a.score !== null && a.score !== undefined).length,
      auditsTotal: audits.length,
      deploymentsActive: summary.healthy,
      deploymentsTotal: summary.total,
      avgResponseTime:
        projects.length > 0
          ? Math.round(
              projects
                .filter((p: any) => p.avgResponseTime !== null)
                .reduce((acc: number, p: any) => acc + (p.avgResponseTime || 0), 0) /
                projects.filter((p: any) => p.avgResponseTime !== null).length
            )
          : 0,
    }
  }

  if (activeTab === 'audits') {
    // Audits tab
    const worstAudit = audits.length > 0
      ? audits.reduce((worst: any, current: any) =>
          (current.score || 0) < (worst.score || 0) ? current : worst
        )
      : null

    return {
      servicesHealthy: audits.filter((a: any) => a.score >= 90).length,
      servicesTotal: audits.length,
      auditsComplete: audits.filter((a: any) => a.score !== null && a.score !== undefined).length,
      auditsTotal: audits.length,
      deploymentsActive: audits.filter((a: any) => a.score >= 90).length,
      deploymentsTotal: audits.length,
      avgResponseTime: worstAudit ? worstAudit.score : 0,
      worstAuditName: worstAudit ? worstAudit.name : '',
    }
  }

  // Errors tab - calculate error statistics
  // Group errors by project to find worst offender
  const errorsByProject: Record<string, number> = {}
  errors.forEach((error: any) => {
    const project = error.project || 'Unknown'
    errorsByProject[project] = (errorsByProject[project] || 0) + 1
  })

  // Find project with most errors
  const worstProject = Object.entries(errorsByProject).reduce(
    (worst, [project, count]) => {
      if (count > worst.count) return { project, count }
      return worst
    },
    { project: 'None', count: 0 }
  )

  return {
    servicesHealthy: errors.length, // Total errors count
    servicesTotal: errors.filter((e: any) => e.severity === 'critical').length + errors.filter((e: any) => e.severity === 'error').length,
    auditsComplete: 0, // Not used for errors
    auditsTotal: 0, // Not used for errors
    deploymentsActive: worstProject.count,
    deploymentsTotal: 0, // Not used
    avgResponseTime: 0, // Not used
    worstProjectName: worstProject.project,
  }
}
