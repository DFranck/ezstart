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
import { useMonitoringAudits } from '../hooks/useMonitoringAudits'
import { useSocket } from '../hooks/useSocket'
import { calculateAuditsHealth, getMetricsData } from '../lib/utils'
import { AuditCard } from './components/AuditCard'
import { AuditsFilters } from './components/AuditsFilters'

function AuditsMonitoringContent(): any {
  const { isDesktop } = useDevice()
  const t = useTranslations('monitoring')
  const queryClient = useQueryClient()
  const { secondsLeft, reset: resetCountdown } = useCountdown(300) // 5 minutes

  // Fetch audits data
  const { data: auditsData, isLoading, error, isFetching } = useMonitoringAudits()

  // Extract data - Filter out domain-level audits (only keep categories)
  const allAudits = auditsData?.audits || []
  const audits = allAudits.filter((audit: any) => {
    // Domain-level audits have filePath like "docs/audits.json → domains.backend"
    // Category-level audits have filePath like "docs/audits.json → domains.backend.categories.api"
    return audit.filePath && audit.filePath.includes('.categories.')
  })

  // Socket.IO real-time updates
  useSocket({
    onHealthChecksUpdated: () => {
      logger.debug('[Monitoring] Health checks updated via Socket.IO')
      queryClient.invalidateQueries({ queryKey: ['monitoring'] })
      resetCountdown()
    },
  })

  const summary = { total: 0, healthy: 0, degraded: 0, unhealthy: 0 }

  // Calculate health and metrics
  const auditsHealth = calculateAuditsHealth(audits)
  const metricsData = getMetricsData('audits', summary, audits, [], [])

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
            <P className="text-destructive font-semibold">Failed to load monitoring data</P>
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
          <H1>{t('auditsPage.title')}</H1>
          <P className="text-muted-foreground">{t('auditsPage.description')}</P>
          <Div className="flex items-center gap-3">
            <P className="text-xs text-muted-foreground">
              Next update in: {minutes}:{String(seconds).padStart(2, '0')}
            </P>
          </Div>
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
          {isDesktop && <MetricsOverview activeTab="audits" metrics={metricsData} />}{' '}
        </Div>
      </Section>

      {/* Audits Grid Section */}
      <Section size="full" className="max-w-7xl">
        <Div layout="center">
          <H2>Audits Overview ({audits.length})</H2>
          <P className="text-muted-foreground">{t('auditsPage.detailsSubtitle')}</P>
        </Div>

        {/* Filters */}
        <AuditsFilters audits={audits}>
          {filteredAudits => {
            // Adaptive grid columns based on number of audits
            // Mobile: always 1 col
            // Tablet: max 2 cols (1 if 1 audit, 2 if 2+)
            // Desktop: max 3 cols (1 if 1 audit, 2 if 2 audits, 3 if 3+)
            const count = filteredAudits.length
            const gridCols =
              count === 0
                ? 'grid-cols-1'
                : count === 1
                  ? 'grid-cols-1'
                  : count === 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'

            return (
              <>
                {/* Audits Grid */}
                <Div className={`grid ${gridCols} gap-4 mt-4`}>
                  {filteredAudits.map((audit: any) => (
                    <Div key={audit.auditType} id={`audit-${audit.auditType}`}>
                      <AuditCard audit={audit} />
                    </Div>
                  ))}
                </Div>

                {filteredAudits.length === 0 && audits.length > 0 && (
                  <Div className="text-center py-12">
                    <P className="text-muted-foreground">No audits match your filters.</P>
                  </Div>
                )}

                {audits.length === 0 && (
                  <Div className="text-center py-12">
                    <P className="text-muted-foreground">{t('auditsPage.noAudits')}</P>
                  </Div>
                )}
              </>
            )
          }}
        </AuditsFilters>
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
