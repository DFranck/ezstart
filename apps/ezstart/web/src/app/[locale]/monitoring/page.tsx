import { getApiUrl } from '@ezstart/config'
import { H1, P, Section, Tabs, TabsContent, TabsList, TabsTrigger } from '@ezstart/ui/components'
import { AuditCard } from './components/AuditCard'
import { HealthScore } from './components/HealthScore'
import { MetricsOverview } from './components/MetricsOverview'
import { ProjectCard } from './components/ProjectCard'

// Get monitoring API URL based on environment
const MONITORING_API_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5080'
    : getApiUrl('monitoring', 'production')

async function getProjects() {
  try {
    const res = await fetch(`${MONITORING_API_URL}/api/projects`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Failed to fetch projects`)
    return res.json()
  } catch (error) {
    console.error('[Monitoring] Error fetching projects:', error)
    return { projects: [], summary: { total: 0, healthy: 0, degraded: 0, unhealthy: 0 } }
  }
}

async function getAudits() {
  try {
    const res = await fetch(`${MONITORING_API_URL}/api/audits`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('Failed to fetch audits')
    return res.json()
  } catch (error) {
    console.error('Error fetching audits:', error)
    return { audits: [] }
  }
}

function calculateOverallHealth(summary: any) {
  const { total, healthy, degraded } = summary
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

export default async function MonitoringPage() {
  const [projectsData, auditsData] = await Promise.all([getProjects(), getAudits()])

  const projects = projectsData.projects || []
  const audits = auditsData.audits || []
  const summary = projectsData.summary || { total: 0, healthy: 0, degraded: 0, unhealthy: 0 }

  const { score, status } = calculateOverallHealth(summary)

  const metricsData = {
    servicesHealthy: summary.healthy,
    servicesTotal: summary.total,
    auditsComplete: audits.filter((a: any) => a.status === 'complete').length,
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

  return (
    <>
      <>
        <Section size={'full'}>
          {/* Header */}
          <div className="space-y-2">
            <H1>System Monitoring Dashboard</H1>
            <P className="text-muted-foreground">
              Real-time monitoring of all projects across the @ezstart monorepo
            </P>
          </div>

          {/* Overall Health Score */}
          <HealthScore score={score} status={status} />

          {/* Metrics Overview */}
          <MetricsOverview metrics={metricsData} />
        </Section>

        {/* Tabs for different monitoring sections */}
        {/* Future tabs: Deployments, Logs, Metrics, Database, Git */}
        <Tabs defaultValue="projects" className="w-full max-w-7xl">
          <TabsList className="grid w-full max-w-lg grid-cols-2">
            <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
            <TabsTrigger value="audits">Audits ({audits.length})</TabsTrigger>
            {/* <TabsTrigger value="deployments">Deployments</TabsTrigger> */}
            {/* <TabsTrigger value="logs">Logs</TabsTrigger> */}
            {/* <TabsTrigger value="metrics">Metrics</TabsTrigger> */}
          </TabsList>

          <TabsContent value="projects" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project: any) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {projects.length === 0 && (
              <div className="text-center py-12">
                <P className="text-muted-foreground">No projects found</P>
              </div>
            )}
          </TabsContent>

          <TabsContent value="audits" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {audits.map((audit: any) => (
                <AuditCard key={audit.auditType} audit={audit} />
              ))}
            </div>

            {audits.length === 0 && (
              <div className="text-center py-12">
                <P className="text-muted-foreground">No audits found</P>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </>
    </>
  )
}
