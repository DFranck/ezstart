'use client'

import { logger } from '@ezstart/logger'
import { Div, P, Section, Spinner } from '@ezstart/ui/components'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { SystemOverview } from '../../../monitoring/components/SystemOverview'
import { useCountdown } from '../../../monitoring/hooks/useCountdown'
import { useMonitoringAudits } from '../../../monitoring/hooks/useMonitoringAudits'
import { useMonitoringErrors } from '../../../monitoring/hooks/useMonitoringErrors'
import { useMonitoringProjects } from '../../../monitoring/hooks/useMonitoringProjects'
import { useSocket } from '../../../monitoring/hooks/useSocket'
import { getMetricsData } from '../../../monitoring/lib/utils'

export function MonitoringTab() {
  const t = useTranslations('monitoring')
  const queryClient = useQueryClient()
  const { reset: resetCountdown } = useCountdown(300)

  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useMonitoringProjects()

  const { data: auditsData, isLoading: isLoadingAudits, error: auditsError } = useMonitoringAudits()
  const { data: errorsData, isLoading: isLoadingErrors, error: errorsError } = useMonitoringErrors()

  useSocket({
    onHealthChecksUpdated: () => {
      logger.debug('[Monitoring] Health checks updated via Socket.IO')
      queryClient.invalidateQueries({ queryKey: ['monitoring'] })
      resetCountdown()
    },
  })

  const projects = projectsData?.projects || []
  const summary = projectsData?.summary || { total: 0, healthy: 0, degraded: 0, unhealthy: 0 }
  const audits = auditsData?.audits || []
  const errors = errorsData?.logs || []

  const isLoading = isLoadingProjects || isLoadingAudits || isLoadingErrors
  const error = projectsError || auditsError || errorsError

  if (isLoading) {
    return (
      <Div className="flex flex-col items-center justify-center py-20 gap-4">
        <Spinner size="xl" text={t('loading')} variant="fancy" />
      </Div>
    )
  }

  if (error) {
    const errorMessage =
      error instanceof Error
        ? error.message === 'Failed to fetch'
          ? t('apiOffline')
          : error.message
        : 'Unknown error'

    return (
      <Div className="flex items-center justify-center py-20">
        <Div className="space-y-4 text-center max-w-lg">
          <P className="text-destructive font-semibold">{t('failedToLoad')}</P>
          <P className="text-muted-foreground">{errorMessage}</P>
        </Div>
      </Div>
    )
  }

  return (
    <Div className="mt-4">
      <SystemOverview projects={projects} audits={audits} errors={errors} summary={summary} />
    </Div>
  )
}
