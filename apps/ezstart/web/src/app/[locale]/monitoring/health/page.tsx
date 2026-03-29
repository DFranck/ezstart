'use client'

import { AccessDenied, LoginButton, RequireAuth } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import { logger } from '@ezstart/logger'
import { Card, Div, H1, H2, P, Section, Spinner } from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { MetricsOverview } from '../components/MetricsOverview'
import { TabScore } from '../components/TabScore'
import { useCountdown } from '../hooks/useCountdown'
import { useMonitoringProjects } from '../hooks/useMonitoringProjects'
import { useSocket } from '../hooks/useSocket'
import { calculateOverallHealth, getMetricsData } from '../lib/utils'
import { ProjectCard } from './components/ProjectCard'

function HealthMonitoringContent(): any {
  const { isDesktop } = useDevice()
  const t = useTranslations('monitoring')
  const queryClient = useQueryClient()
  const { secondsLeft, reset: resetCountdown } = useCountdown(300) // 5 minutes

  // Fetch projects data
  const { data: projectsData, isLoading, error, isFetching } = useMonitoringProjects()

  // Socket.IO real-time updates
  useSocket({
    onHealthChecksUpdated: () => {
      logger.debug('[Monitoring] Health checks updated via Socket.IO')
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

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const timeDisplay = `${minutes}:${String(seconds).padStart(2, '0')}`

  // Loading state
  if (isLoading) {
    return (
      <Section size="full">
        <Div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spinner size="xl" text={t('loading')} variant="fancy" />
        </Div>
      </Section>
    )
  }

  // Error state
  if (error) {
    const errorMessage =
      error instanceof Error
        ? error.message === 'Failed to fetch'
          ? t('apiOffline')
          : error.message
        : 'Unknown error'

    return (
      <Section size="full">
        <Div className="flex items-center justify-center py-20">
          <Div className="space-y-4 text-center max-w-lg">
            <Div className="text-6xl">⚠️</Div>
            <P className="text-destructive font-semibold">{t('failedToLoad')}</P>
            <P className="text-muted-foreground">{errorMessage}</P>
          </Div>
        </Div>
      </Section>
    )
  }

  return (
    <>
      {/* Hero Section */}
      <Section size="full" className="max-w-7xl">
        <Div layout={'center'}>
          <H1>{t('health.title')}</H1>
          <P className="text-muted-foreground">{t('health.description')}</P>
          <Div className="flex items-center gap-3">
            <P className="text-xs text-muted-foreground">
              {t('nextUpdateIn', { time: timeDisplay })}
            </P>
          </Div>
        </Div>

        <Div layout="grid" size={'full'}>
          {/* Projects Health Score */}
          <TabScore
            score={projectsHealth.score}
            status={projectsHealth.status}
            title={t('projectsHealthScore')}
            subtitle={t('projectsMonitored', { count: summary.total })}
          />
          {/* Metrics Overview */}
          {isDesktop && <MetricsOverview activeTab="projects" metrics={metricsData} />}
        </Div>
      </Section>

      {/* Projects Grid Section */}
      <Section size="full" className="max-w-7xl">
        <Div layout="center">
          <H2>{t('allProjects', { count: projects.length })}</H2>
          <P className="text-muted-foreground">{t('health.detailsSubtitle')}</P>
        </Div>

        <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </Div>

        {projects.length === 0 && (
          <Div className="text-center py-12">
            <P className="text-muted-foreground">{t('health.noProjects')}</P>
          </Div>
        )}
      </Section>
    </>
  )
}

export default function HealthMonitoringPage() {
  const t = useTranslations('auth')

  return (
    <RequireAuth
      loadingComponent={
        <Section size="full">
          <Spinner size="lg" />
        </Section>
      }
      fallbackComponent={
        <Section size="full">
          <Card variant={'ghost'}>
            <AccessDenied>
              <LoginButton>{t('login')}</LoginButton>
            </AccessDenied>
          </Card>
        </Section>
      }
    >
      <RequireRole
        roles="superadmin"
        fallbackComponent={
          <Section size={'full'}>
            <Card variant={'ghost'}>
              <InsufficientPermissions requiredRoles="superadmin" />
            </Card>
          </Section>
        }
      >
        <HealthMonitoringContent />
      </RequireRole>
    </RequireAuth>
  )
}
