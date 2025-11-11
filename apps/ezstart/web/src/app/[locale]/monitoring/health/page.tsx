'use client'

import { Div, H1, H2, P, Section, Spinner } from '@ezstart/ui/components'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { MetricsOverview } from '../components/MetricsOverview'
import { TabScore } from '../components/TabScore'
import { useCountdown } from '../hooks/useCountdown'
import { useMonitoringProjects } from '../hooks/useMonitoringProjects'
import { useSocket } from '../hooks/useSocket'
import { calculateOverallHealth, getMetricsData } from '../lib/utils'
import { ProjectCard } from './components/ProjectCard'
import { TrendingMetrics } from './components/TrendingMetrics'

export default function HealthMonitoringPage(): any {
  const t = useTranslations('monitoring')
  const queryClient = useQueryClient()
  const { secondsLeft, reset: resetCountdown } = useCountdown(300) // 5 minutes

  // Fetch projects data
  const { data: projectsData, isLoading, error, isFetching } = useMonitoringProjects()

  // Socket.IO real-time updates
  useSocket({
    onHealthChecksUpdated: () => {
      console.log('[Monitoring] Health checks updated via Socket.IO')
      queryClient.invalidateQueries({ queryKey: ['monitoring'] })
      resetCountdown()
    },
  })

  // Extract data
  const projects = projectsData?.projects || []
  const summary = projectsData?.summary || { total: 0, healthy: 0, degraded: 0, unhealthy: 0 }

  // Calculate health and metrics
  const projectsHealth = calculateOverallHealth(summary)
  const metricsData = getMetricsData('projects', summary, [], projects, [])

  // Loading state
  if (isLoading) {
    return (
      <Section size="full">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spinner size="xl" text={t('loading')} variant="fancy" />
        </div>
      </Section>
    )
  }

  // Error state
  if (error) {
    const errorMessage =
      error instanceof Error
        ? error.message === 'Failed to fetch'
          ? 'Monitoring API is offline or sleeping. Please wait 30-60s, then refresh.'
          : error.message
        : 'Unknown error'

    return (
      <Section size="full">
        <div className="flex items-center justify-center py-20">
          <div className="space-y-4 text-center max-w-lg">
            <div className="text-6xl">⚠️</div>
            <P className="text-destructive font-semibold">Failed to load monitoring data</P>
            <P className="text-muted-foreground">{errorMessage}</P>
          </div>
        </div>
      </Section>
    )
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <>
      {/* Hero Section */}
      <Section size="full" className="max-w-7xl">
        <Div layout={'center'}>
          <H1>Projects Health</H1>
          <P className="text-muted-foreground">
            Real-time health monitoring of all services across the @ezstart monorepo
          </P>
          <div className="flex items-center gap-3">
            <P className="text-xs text-muted-foreground">
              Next update in: {minutes}:{String(seconds).padStart(2, '0')}
            </P>
          </div>
        </Div>

        <Div layout="grid" size={'full'}>
          {/* Projects Health Score */}
          <TabScore
            score={projectsHealth.score}
            status={projectsHealth.status}
            title="Projects Health Score"
            subtitle={`${summary.total} projects monitored`}
          />
          {/* Metrics Overview */}
          <MetricsOverview activeTab="projects" metrics={metricsData} />
        </Div>
      </Section>

      {/* Trending Metrics Section */}
      <Section size="full" className="max-w-7xl">
        <Div layout="center">
          <H2>Trending Metrics</H2>
          <P className="text-muted-foreground">Performance trends for top monitored projects</P>
        </Div>

        <div className="space-y-6">
          {projects.slice(0, 3).map((project: any) => (
            <TrendingMetrics key={project.id} projectId={project.id} projectName={project.name} />
          ))}
        </div>
      </Section>

      {/* Projects Grid Section */}
      <Section size="full" className="max-w-7xl">
        <Div layout="center">
          <H2>All Projects ({projects.length})</H2>
          <P className="text-muted-foreground">Detailed health status for each project</P>
        </Div>

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
      </Section>
    </>
  )
}
