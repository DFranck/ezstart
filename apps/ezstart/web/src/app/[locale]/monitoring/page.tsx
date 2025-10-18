'use client'

import { getApiUrl } from '@ezstart/config'
import {
  Button,
  H1,
  Icon,
  P,
  Section,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useEffect, useState } from 'react'
import { AuditCard } from './components/AuditCard'
import { HealthScore } from './components/HealthScore'
import { MetricsOverview } from './components/MetricsOverview'
import { ProjectCard } from './components/ProjectCard'

// Get monitoring API URL based on environment
const MONITORING_API_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5080'
    : getApiUrl('monitoring', 'production')

interface ProjectsData {
  projects: any[]
  summary: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
  }
}

interface AuditsData {
  audits: any[]
}

function calculateOverallHealth(summary: ProjectsData['summary']) {
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

export default function MonitoringDashboard() {
  const [projectsData, setProjectsData] = useState<ProjectsData>({
    projects: [],
    summary: { total: 0, healthy: 0, degraded: 0, unhealthy: 0 },
  })
  const [auditsData, setAuditsData] = useState<AuditsData>({ audits: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Fetch monitoring data
  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)
      else setIsRefreshing(true)
      setError(null)

      // Fetch with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

      const [projectsRes, auditsRes] = await Promise.all([
        fetch(`${MONITORING_API_URL}/api/projects`, {
          cache: 'no-store',
          signal: controller.signal,
        }),
        fetch(`${MONITORING_API_URL}/api/audits`, {
          cache: 'no-store',
          signal: controller.signal,
        }),
      ])

      clearTimeout(timeoutId)

      if (!projectsRes.ok || !auditsRes.ok) {
        throw new Error('Failed to fetch monitoring data')
      }

      const [projects, audits] = await Promise.all([projectsRes.json(), auditsRes.json()])

      setProjectsData(projects)
      setAuditsData(audits)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('[Monitoring] Error fetching data:', err)
      setError(
        err instanceof Error
          ? err.message === 'Failed to fetch'
            ? 'Monitoring API is offline or sleeping. Please wait 30-60s for Render to wake up, then refresh.'
            : err.message
          : 'Unknown error'
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Trigger manual health checks on all services
  const triggerHealthChecks = async () => {
    try {
      setIsRefreshing(true)

      // Trigger health checks via monitoring API
      await fetch(`${MONITORING_API_URL}/api/trigger-checks`, {
        method: 'POST',
        cache: 'no-store',
      })

      // Wait a bit for checks to complete, then refresh data
      setTimeout(() => {
        fetchData(false)
      }, 2000)
    } catch (err) {
      console.error('[Monitoring] Error triggering health checks:', err)
      // Still refresh data even if trigger fails
      fetchData(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [])

  // Auto-refresh every 5 minutes (synced with health check interval)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[Monitoring] Auto-refreshing data (5min interval)...')
      fetchData(false)
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [])

  const { projects, summary } = projectsData
  const { audits } = auditsData
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

  // Loading state
  if (isLoading) {
    return (
      <Section size="full">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spinner size="xl" text="Loading monitoring data..." variant="fancy" />
          <P className="text-sm text-muted-foreground">
            (If on Render free tier, this may take 30-60s for cold start)
          </P>
        </div>
      </Section>
    )
  }

  // Error state
  if (error) {
    return (
      <Section size="full">
        <div className="flex items-center justify-center py-20">
          <div className="space-y-4 text-center max-w-lg">
            <div className="text-6xl">⚠️</div>
            <P className="text-destructive font-semibold">Failed to load monitoring data</P>
            <P className="text-muted-foreground">{error}</P>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </Section>
    )
  }

  return (
    <>
      <Section size="full">
        {/* Header */}
        <div className="space-y-2 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <H1>System Monitoring Dashboard</H1>
              <P className="text-muted-foreground">
                Real-time monitoring of all projects across the @ezstart monorepo
              </P>
            </div>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <P className="text-xs text-muted-foreground">
                  Last refresh: {lastRefresh.toLocaleTimeString()}
                </P>
              )}
              <Button
                onClick={triggerHealthChecks}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Icon
                  name="lucide:RefreshCw"
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                {isRefreshing ? 'Checking...' : 'Refresh Now'}
              </Button>
            </div>
          </div>
        </div>
        {/* Overall Health Score */}
        <HealthScore score={score} status={status} />

        {/* Metrics Overview */}
        <MetricsOverview metrics={metricsData} />
      </Section>

      {/* Tabs for different monitoring sections */}
      <Tabs defaultValue="projects" className="w-full max-w-7xl">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="audits">Audits ({audits.length})</TabsTrigger>
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
  )
}
