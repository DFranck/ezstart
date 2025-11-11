'use client'

import { Div, H1, H2, P, Section, Spinner } from '@ezstart/ui/components'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ErrorsFeed } from './components/ErrorsFeed'
import { MetricsOverview } from '../components/MetricsOverview'
import { TabScore } from '../components/TabScore'
import { useCountdown } from '../hooks/useCountdown'
import { useMonitoringErrors } from '../hooks/useMonitoringErrors'
import { useSocket } from '../hooks/useSocket'
import { calculateErrorsHealth, getMetricsData } from '../lib/utils'

export default function ErrorsMonitoringPage(): any {
  const t = useTranslations('monitoring')
  const queryClient = useQueryClient()
  const { secondsLeft, reset: resetCountdown } = useCountdown(300) // 5 minutes

  // Fetch errors data
  const {
    data: errorsData,
    isLoading,
    error,
    isFetching,
  } = useMonitoringErrors()

  // Socket.IO real-time updates
  useSocket({
    onHealthChecksUpdated: () => {
      console.log('[Monitoring] Health checks updated via Socket.IO')
      queryClient.invalidateQueries({ queryKey: ['monitoring'] })
      resetCountdown()
    },
  })

  // Extract data
  const errors = errorsData?.logs || []
  const summary = { total: 0, healthy: 0, degraded: 0, unhealthy: 0 }

  // Calculate health and metrics
  const errorsHealth = calculateErrorsHealth(errors)
  const metricsData = getMetricsData('errors', summary, [], [], errors)

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
          <H1>Error Monitoring</H1>
          <P className="text-muted-foreground">
            Real-time error tracking and logs from all monitored services
          </P>
          <div className="flex items-center gap-3">
            <P className="text-xs text-muted-foreground">
              Next update in: {minutes}:{String(seconds).padStart(2, '0')}
            </P>
          </div>
        </Div>

        <Div layout="grid" size={'full'}>
          {/* Error Status Score */}
          <TabScore
            score={errorsHealth.score}
            status={errorsHealth.status}
            title="Error Status Score"
            subtitle="Based on last 24 hours"
          />
          {/* Metrics Overview */}
          <MetricsOverview activeTab="errors" metrics={metricsData} />
        </Div>
      </Section>

      {/* Errors Feed Section */}
      <Section size="full" className="max-w-7xl">
        <Div layout="center">
          <H2>Recent Errors</H2>
          <P className="text-muted-foreground">Live feed of errors from all monitored services</P>
        </Div>

        <ErrorsFeed />
      </Section>
    </>
  )
}
