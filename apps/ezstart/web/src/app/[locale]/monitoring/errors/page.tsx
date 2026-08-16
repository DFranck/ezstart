'use client'

import { AccessDenied, LoginButton, RequireAuth } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { Card, Div, H1, H2, P, Section, Spinner } from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { HealthScoreCard, calculateErrorsHealth, getMetricsData } from '@ezstart/monitoring/client'
import { MetricsOverview } from '../components/MetricsOverview'
import { useCountdown } from '../hooks/useCountdown'
import { useMonitoringErrors } from '../hooks/useMonitoringErrors'
import { useSocket } from '../hooks/useSocket'
import { ErrorsFeed } from './components/ErrorsFeed'

function ErrorsMonitoringContent() {
  const { isDesktop } = useDevice()
  const t = useTranslations('monitoring')
  const queryClient = useQueryClient()
  const { secondsLeft, reset: resetCountdown } = useCountdown(300) // 5 minutes

  // Fetch errors data
  const { data: errorsData, isLoading, error, isFetching } = useMonitoringErrors()

  // Socket.IO real-time updates
  useSocket({
    onHealthChecksUpdated: () => {
      logger.debug('[Monitoring] Health checks updated via Socket.IO')
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
        : t('unknownError')

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

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <>
      {/* Hero Section */}
      <Section size="full" className="max-w-7xl">
        <Div layout={'center'}>
          <H1>{t('errorsPage.title')}</H1>
          <P className="text-muted-foreground">{t('errorsPage.description')}</P>
          <Div className="flex items-center gap-3">
            <P className="text-xs text-muted-foreground">
              {t('nextUpdateIn', { time: `${minutes}:${String(seconds).padStart(2, '0')}` })}
            </P>
          </Div>
        </Div>

        <Div layout="grid" size={'full'}>
          {/* Error Status Score */}
          <HealthScoreCard
            score={errorsHealth.score}
            status={errorsHealth.status}
            title={t('errorStatusScore')}
            subtitle={t('errorsPage.metricsSubtitle')}
          />
          {/* Metrics Overview */}
          {isDesktop && <MetricsOverview activeTab="errors" metrics={metricsData} />}
        </Div>
      </Section>

      {/* Errors Feed Section */}
      <Section size="full" className="max-w-7xl">
        <Div layout="center">
          <H2>{t('errorsPage.recentTitle')}</H2>
          <P className="text-muted-foreground">{t('errorsPage.recentDescription')}</P>
        </Div>

        <ErrorsFeed />
      </Section>
    </>
  )
}

export default function ErrorsMonitoringPage() {
  const t = useTranslations('auth')

  return (
    <RequireAuth
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
        <ErrorsMonitoringContent />
      </RequireRole>
    </RequireAuth>
  )
}
