'use client'

import { getApiUrl } from '@ezstart/config'
import {
  Button,
  Div,
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
import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { AuditCard } from './components/AuditCard'
import { HealthScore } from './components/HealthScore'
import { MetricsOverview } from './components/MetricsOverview'
import { ProjectCard } from './components/ProjectCard'
import { ActivityFeed } from './components/ActivityFeed'

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
  const [nextRefreshIn, setNextRefreshIn] = useState<number>(300) // 5 minutes in seconds
  const [activeTab, setActiveTab] = useState<'projects' | 'audits' | 'activity'>('projects')
  const socketRef = useRef<Socket | null>(null)

  // Fetch monitoring data
  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)
      else setIsRefreshing(true)
      setError(null)

      // Fetch with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

      // Add timestamp to bypass cache
      const timestamp = Date.now()

      const [projectsRes, auditsRes] = await Promise.all([
        fetch(`${MONITORING_API_URL}/api/projects?_t=${timestamp}`, {
          cache: 'no-store',
          signal: controller.signal,
        }),
        fetch(`${MONITORING_API_URL}/api/audits?_t=${timestamp}`, {
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

  // Socket.IO real-time updates
  useEffect(() => {
    // Connect to Socket.IO server
    console.log('[Monitoring] Connecting to Socket.IO...')
    const socket = io(MONITORING_API_URL, {
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Monitoring] Socket.IO connected:', socket.id)
    })

    socket.on('health-checks-updated', (data) => {
      console.log('[Monitoring] Received health-checks-updated event:', data)
      // Refresh data when health checks complete
      fetchData(false)
      // Update lastRefresh to force ProjectCard re-render and history fetch
      setLastRefresh(new Date())
      // Reset countdown to 5 minutes
      setNextRefreshIn(300)
    })

    socket.on('disconnect', () => {
      console.log('[Monitoring] Socket.IO disconnected')
    })

    socket.on('connect_error', (err) => {
      console.error('[Monitoring] Socket.IO connection error:', err.message)
    })

    // Cleanup on unmount
    return () => {
      console.log('[Monitoring] Disconnecting Socket.IO...')
      socket.disconnect()
    }
  }, [])

  // Countdown timer (updates every second)
  useEffect(() => {
    const interval = setInterval(() => {
      setNextRefreshIn(prev => {
        if (prev <= 1) {
          // Reset to 5 minutes when countdown reaches 0
          return 300
        }
        return prev - 1
      })
    }, 1000) // 1 second

    return () => clearInterval(interval)
  }, [])

  // Auto-refresh every 5 minutes as fallback (in case Socket.IO fails)
  useEffect(() => {
    const interval = setInterval(
      () => {
        console.log('[Monitoring] Auto-refreshing data (5min fallback)...')
        fetchData(false)
        setNextRefreshIn(300) // Reset countdown
      },
      5 * 60 * 1000
    ) // 5 minutes

    return () => clearInterval(interval)
  }, [])

  const { projects, summary } = projectsData
  const { audits } = auditsData

  // Calculate metrics based on active tab
  const projectsHealth = calculateOverallHealth(summary)

  // Calculate audits global score
  const auditsGlobalScore = audits.length > 0
    ? Math.round(audits.reduce((acc: number, a: any) => acc + (a.score || 0), 0) / audits.length)
    : 0

  let auditsStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  if (auditsGlobalScore >= 90) auditsStatus = 'excellent'
  else if (auditsGlobalScore >= 70) auditsStatus = 'good'
  else if (auditsGlobalScore >= 50) auditsStatus = 'fair'
  else if (auditsGlobalScore >= 30) auditsStatus = 'poor'
  else auditsStatus = 'critical'

  // Dynamic score/status based on active tab
  const { score, status } = activeTab === 'projects'
    ? projectsHealth
    : { score: auditsGlobalScore, status: auditsStatus }

  // Dynamic metrics based on active tab
  const metricsData = activeTab === 'projects'
    ? {
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
    : {
        servicesHealthy: audits.filter((a: any) => a.score >= 80).length,
        servicesTotal: audits.length,
        auditsComplete: audits.filter((a: any) => a.status === 'complete').length,
        auditsTotal: audits.length,
        deploymentsActive: audits.filter((a: any) => a.score >= 90).length,
        deploymentsTotal: audits.length,
        avgResponseTime: Math.round(auditsGlobalScore),
      }

  // Loading state
  if (isLoading) {
    return (
      <Section size="full">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spinner size="xl" text="Loading monitoring data..." variant="fancy" />
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
        <Div layout={'center'}>
          <H1>System Monitoring Dashboard</H1>
          <P className="text-muted-foreground">
            Real-time monitoring of all projects across the @ezstart monorepo
          </P>
          <div className="flex items-center gap-3">
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
            {lastRefresh && (
              <div className="flex flex-col items-end gap-1">
                <P className="text-xs text-muted-foreground">
                  Last refresh: {lastRefresh.toLocaleTimeString()}
                </P>
                <P className="text-xs text-muted-foreground">
                  Next update in: {Math.floor(nextRefreshIn / 60)}:{String(nextRefreshIn % 60).padStart(2, '0')}
                </P>
              </div>
            )}
          </div>
        </Div>
        {/* Overall Health Score */}
        <HealthScore score={score} status={status} />

        {/* Metrics Overview */}
        <MetricsOverview metrics={metricsData} />
      </Section>

      {/* Tabs for different monitoring sections */}
      <Tabs defaultValue="projects" className="w-full max-w-7xl px-2" onValueChange={(value) => setActiveTab(value as 'projects' | 'audits' | 'activity')}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="audits">Audits ({audits.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project: any) => (
              <ProjectCard
                key={`${project.id}-${lastRefresh?.getTime() || 'initial'}`}
                project={project}
              />
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

        <TabsContent value="activity" className="space-y-4 mt-6">
          <ActivityFeed apiUrl={MONITORING_API_URL} />
        </TabsContent>
      </Tabs>
    </>
  )
}
