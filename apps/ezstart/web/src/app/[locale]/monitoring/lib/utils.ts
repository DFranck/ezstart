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

export function getMetricsData(
  activeTab: 'projects' | 'audits' | 'activity',
  summary: ProjectsData['summary'],
  audits: any[],
  projects: any[]
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

  // Audits tab
  const worstAudit = audits.length > 0
    ? audits.reduce((worst: any, current: any) =>
        (current.score || 0) < (worst.score || 0) ? current : worst
      )
    : null

  return {
    servicesHealthy: audits.filter((a: any) => a.score >= 80).length,
    servicesTotal: audits.length,
    auditsComplete: audits.filter((a: any) => a.score !== null && a.score !== undefined).length,
    auditsTotal: audits.length,
    deploymentsActive: audits.filter((a: any) => a.score >= 90).length,
    deploymentsTotal: audits.length,
    avgResponseTime: worstAudit ? worstAudit.score : 0,
    worstAuditName: worstAudit ? worstAudit.auditType : '',
  }
}
