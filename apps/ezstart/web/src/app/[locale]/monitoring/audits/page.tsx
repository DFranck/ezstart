'use client'

import { AccessDenied, LoginButton, RequireAuth } from '@ezstart/auth-sdk'
import { RequireRole, InsufficientPermissions } from '@ezstart/rbac'
import { Card, Div, H1, H2, P, Section, Spinner } from '@ezstart/ui/components'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { MetricsOverview } from '../components/MetricsOverview'
import { TabScore } from '../components/TabScore'
import { AuditCard } from '../health/components/AuditCard'
import { useCountdown } from '../hooks/useCountdown'
import { useMonitoringAudits } from '../hooks/useMonitoringAudits'
import { useSocket } from '../hooks/useSocket'
import { calculateAuditsHealth, getMetricsData } from '../lib/utils'

function AuditsMonitoringContent(): any {
  const t = useTranslations('monitoring')
  const queryClient = useQueryClient()
  const { secondsLeft, reset: resetCountdown } = useCountdown(300) // 5 minutes

  // Fetch audits data
  const { data: auditsData, isLoading, error, isFetching } = useMonitoringAudits()

  // Socket.IO real-time updates
  useSocket({
    onHealthChecksUpdated: () => {
      console.log('[Monitoring] Health checks updated via Socket.IO')
      queryClient.invalidateQueries({ queryKey: ['monitoring'] })
      resetCountdown()
    },
  })

  // Extract data
  const audits = auditsData?.audits || []
  const summary = { total: 0, healthy: 0, degraded: 0, unhealthy: 0 }

  // Calculate health and metrics
  const auditsHealth = calculateAuditsHealth(audits)
  const metricsData = getMetricsData('audits', summary, audits, [], [])

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
      {/* Hero Section */}
      <Section size="full" className="max-w-7xl">
        <Div layout={'center'}>
          <H1>{t('auditsPage.title')}</H1>
          <P className="text-muted-foreground">
            {t('auditsPage.description')}
          </P>
          <div className="flex items-center gap-3">
            <P className="text-xs text-muted-foreground">
              Next update in: {minutes}:{String(seconds).padStart(2, '0')}
            </P>
          </div>
        </Div>

        <Div layout="grid" size={'full'}>
          {/* Audits Quality Score */}
          <TabScore
            score={auditsHealth.score}
            status={auditsHealth.status}
            title="Audits Quality Score"
            subtitle={`${audits.length} audits completed`}
          />
          {/* Metrics Overview */}
          <MetricsOverview activeTab="audits" metrics={metricsData} />
        </Div>
      </Section>

      {/* Audits Grid Section */}
      <Section size="full" className="max-w-7xl">
        <Div layout="center">
          <H2>All Audits ({audits.length})</H2>
          <P className="text-muted-foreground">{t('auditsPage.detailsSubtitle')}</P>
        </Div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audits.map((audit: any) => (
            <AuditCard key={audit.auditType} audit={audit} />
          ))}
        </div>

        {audits.length === 0 && (
          <div className="text-center py-12">
            <P className="text-muted-foreground">{t('auditsPage.noAudits')}</P>
          </div>
        )}
      </Section>
    </>
  )
}

export default function AuditsMonitoringPage() {
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
        <AuditsMonitoringContent />
      </RequireRole>
    </RequireAuth>
  )
}
