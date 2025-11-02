'use client'

import {
  Button,
  Div,
  H1,
  P,
  Section,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ErrorsFeed } from './(errors-tab)/components/ErrorsFeed'
import { AuditCard } from './(health-tab)/components/AuditCard'
import { ProjectCard } from './(health-tab)/components/ProjectCard'
import { MetricsOverview } from './components/MetricsOverview'
import { TabScore } from './components/TabScore'
import { useCountdown } from './hooks/useCountdown'
import { useMonitoringAudits } from './hooks/useMonitoringAudits'
import { useMonitoringErrors } from './hooks/useMonitoringErrors'
import { useMonitoringProjects } from './hooks/useMonitoringProjects'
import { useSocket } from './hooks/useSocket'
import { MONITORING_API_URL } from './lib/config'
import {
  calculateAuditsHealth,
  calculateErrorsHealth,
  calculateOverallHealth,
  getMetricsData,
} from './lib/utils'

export default function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState<'projects' | 'audits' | 'errors'>('projects')
  const queryClient = useQueryClient()
  const { secondsLeft, reset: resetCountdown } = useCountdown(300) // 5 minutes
  const { isMobile } = useDevice()
  // Fetch data with React Query
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsError,
    isFetching: isFetchingProjects,
    refetch: refetchProjects,
  } = useMonitoringProjects()

  const {
    data: auditsData,
    isLoading: isLoadingAudits,
    error: auditsError,
    isFetching: isFetchingAudits,
    refetch: refetchAudits,
  } = useMonitoringAudits()

  const {
    data: errorsData,
    isLoading: isLoadingErrors,
    error: errorsError,
    isFetching: isFetchingErrors,
  } = useMonitoringErrors()

  // Socket.IO real-time updates
  useSocket({
    onHealthChecksUpdated: () => {
      console.log('[Monitoring] Health checks updated via Socket.IO')
      queryClient.invalidateQueries({ queryKey: ['monitoring'] })
      resetCountdown()
    },
  })

  // Trigger manual health checks
  const triggerHealthChecks = async () => {
    try {
      await fetch(`${MONITORING_API_URL}/api/trigger-checks`, {
        method: 'POST',
        cache: 'no-store',
      })

      // Wait for checks to complete, then refetch
      setTimeout(() => {
        refetchProjects()
        refetchAudits()
      }, 2000)
    } catch (err) {
      console.error('[Monitoring] Error triggering health checks:', err)
      // Still refetch even if trigger fails
      refetchProjects()
      refetchAudits()
    }
  }

  // Extract data
  const projects = projectsData?.projects || []
  const summary = projectsData?.summary || { total: 0, healthy: 0, degraded: 0, unhealthy: 0 }
  const audits = auditsData?.audits || []
  const errors = errorsData?.logs || []

  // Calculate health and metrics
  const projectsHealth = calculateOverallHealth(summary)
  const auditsHealth = calculateAuditsHealth(audits)
  const errorsHealth = calculateErrorsHealth(errors)

  const { score, status } =
    activeTab === 'projects' ? projectsHealth : activeTab === 'audits' ? auditsHealth : errorsHealth

  const tabConfig =
    activeTab === 'projects'
      ? {
          title: 'Projects Health Score',
          subtitle: `${summary.total} projects monitored`,
        }
      : activeTab === 'audits'
        ? {
            title: 'Audits Quality Score',
            subtitle: `${audits.length} audits completed`,
          }
        : {
            title: 'Error Status Score',
            subtitle: `Based on last 24 hours`,
          }

  const metricsData = getMetricsData(activeTab, summary, audits, projects, errors)

  const isLoading = isLoadingProjects || isLoadingAudits || isLoadingErrors
  const isRefreshing = isFetchingProjects || isFetchingAudits || isFetchingErrors
  const error = projectsError || auditsError || errorsError

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
    const errorMessage =
      error instanceof Error
        ? error.message === 'Failed to fetch'
          ? 'Monitoring API is offline or sleeping. Please wait 30-60s for Render to wake up, then refresh.'
          : error.message
        : 'Unknown error'

    return (
      <Section size="full">
        <div className="flex items-center justify-center py-20">
          <div className="space-y-4 text-center max-w-lg">
            <div className="text-6xl">⚠️</div>
            <P className="text-destructive font-semibold">Failed to load monitoring data</P>
            <P className="text-muted-foreground">{errorMessage}</P>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </Section>
    )
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <>
      <Section size="full" className="max-w-7xl">
        {/* Header */}
        <Div layout={'center'}>
          <H1>System Monitoring Dashboard</H1>
          <P className="text-muted-foreground">
            Real-time monitoring of all projects across the @ezstart monorepo
          </P>
          <div className="flex items-center gap-3">
            {/* <Button
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
            </Button> */}
            <div className="flex flex-col items-end gap-1">
              {/* <P className="text-xs text-muted-foreground">
                Last refresh: {new Date().toLocaleTimeString()}
              </P> */}
              <P className="text-xs text-muted-foreground">
                Next update in: {minutes}:{String(seconds).padStart(2, '0')}
              </P>
            </div>
          </div>
        </Div>
        <Div layout="grid" size={'full'}>
          {/* Tab-specific Score */}
          <TabScore
            score={score}
            status={status}
            title={tabConfig.title}
            subtitle={tabConfig.subtitle}
          />
          {/* Metrics Overview */}
          {!isMobile && <MetricsOverview activeTab={activeTab} metrics={metricsData} />}
        </Div>
      </Section>
      <Section size="full" className="max-w-7xl">
        {/* Tabs for different monitoring sections */}
        <Tabs
          value={activeTab}
          className="w-full"
          onValueChange={value => setActiveTab(value as 'projects' | 'audits' | 'errors')}
        >
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
            <TabsTrigger value="audits">Audits ({audits.length})</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
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

          <TabsContent value="errors" className="space-y-4 mt-6">
            <ErrorsFeed />
          </TabsContent>
        </Tabs>
      </Section>
    </>
  )
}
