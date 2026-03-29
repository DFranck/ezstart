'use client'

import { AccessDenied, LoginButton, RequireAuth } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { Card, P, Section, Spinner } from '@ezstart/ui/components'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { SystemOverview } from './components/SystemOverview'
import { useCountdown } from './hooks/useCountdown'
import { useMonitoringAudits } from './hooks/useMonitoringAudits'
import { useMonitoringErrors } from './hooks/useMonitoringErrors'
import { useMonitoringProjects } from './hooks/useMonitoringProjects'
import { useSocket } from './hooks/useSocket'
import { getMetricsData } from './lib/utils'

function MonitoringOverviewContent(): any {
  const t = useTranslations('monitoring')
  const queryClient = useQueryClient()
  const { secondsLeft, reset: resetCountdown } = useCountdown(300) // 5 minutes

  // Fetch all data
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useMonitoringProjects()

  const { data: auditsData, isLoading: isLoadingAudits, error: auditsError } = useMonitoringAudits()

  const { data: errorsData, isLoading: isLoadingErrors, error: errorsError } = useMonitoringErrors()

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
  const audits = auditsData?.audits || []
  const errors = errorsData?.logs || []

  // Get overview metrics
  const metricsData = getMetricsData('projects', summary, audits, projects, errors)

  const isLoading = isLoadingProjects || isLoadingAudits || isLoadingErrors
  const error = projectsError || auditsError || errorsError

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
          ? t('apiOffline')
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
      {/* System Overview Section */}
      <Section size="full" className="mt-10">
        <SystemOverview projects={projects} audits={audits} errors={errors} summary={summary} />
      </Section>
    </>
  )
}

export default function MonitoringOverviewPage() {
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
      <MonitoringOverviewContent />
    </RequireAuth>
  )
}
