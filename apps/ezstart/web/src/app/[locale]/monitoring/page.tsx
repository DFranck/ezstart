'use client'

import { AccessDenied, LoginButton, RequireAuth } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { MonitoringDashboard } from '@ezstart/monitoring/client'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  Icon,
  Section,
  Spinner,
} from '@ezstart/ui/components'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCountdown } from './hooks/useCountdown'
import { useMonitoringAudits } from './hooks/useMonitoringAudits'
import { useMonitoringErrors } from './hooks/useMonitoringErrors'
import { useMonitoringProjects } from './hooks/useMonitoringProjects'
import { useSocket } from './hooks/useSocket'

function MonitoringOverviewContent() {
  const t = useTranslations('monitoring')
  const router = useRouter()
  const queryClient = useQueryClient()
  const { reset: resetCountdown } = useCountdown(300) // 5 minutes

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

  const isLoading = isLoadingProjects || isLoadingAudits || isLoadingErrors
  const error =
    projectsError || auditsError || errorsError
      ? (projectsError || auditsError || errorsError) instanceof Error
        ? projectsError || auditsError || errorsError
        : new Error(t('unknownError'))
      : null

  // Quick Actions (app-specific navigation)
  const quickActionsSlot = (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>{t('overview.quickActions.title')}</CardTitle>
        <CardDescription>{t('manageDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Div layout="grid" className="gap-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => router.push('/monitoring/health')}
          >
            <Icon name="lucide:Boxes" className="w-4 h-4" />
            {t('overview.quickActions.viewAllProjects')}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => router.push('/monitoring/audits')}
          >
            <Icon name="lucide:FileCheck" className="w-4 h-4" />
            {t('overview.quickActions.runQualityAudits')}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => router.push('/monitoring/errors')}
          >
            <Icon name="lucide:Bug" className="w-4 h-4" />
            {t('overview.quickActions.viewErrorLogs')}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => window.open('https://ezstart.sentry.io/insights/projects/', '_blank')}
          >
            <Icon name="lucide:ExternalLink" className="w-4 h-4" />
            {t('overview.quickActions.openSentry')}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => window.open('https://vercel.com/ezstart/analytics', '_blank')}
          >
            <Icon name="lucide:BarChart3" className="w-4 h-4" />
            {t('overview.quickActions.viewAnalytics')}
          </Button>
        </Div>
      </CardContent>
    </Card>
  )

  return (
    <Section size="full" className="mt-10">
      <MonitoringDashboard
        projects={projects}
        audits={audits}
        errors={errors}
        summary={summary}
        isLoading={isLoading}
        error={error as Error | null}
        quickActions={quickActionsSlot}
        labels={{
          loadingText: t('loading'),
          errorTitle: t('failedToLoad'),
          errorApiOffline: t('apiOffline'),
          globalHealthTitle: t('overview.stats.globalHealth.title'),
          globalHealthSubtitle: t('overview.stats.globalHealth.subtitle'),
          servicesUptimeTitle: t('overview.stats.servicesUptime.title'),
          servicesUptimeHealthy: t('overview.stats.servicesUptime.healthy'),
          criticalErrorsTitle: t('overview.stats.criticalErrors.title'),
          criticalErrorsSubtitle: t('overview.stats.criticalErrors.subtitle'),
          avgResponseTimeTitle: t('overview.stats.avgResponseTime.title'),
          avgResponseTimeSubtitle: t('overview.stats.avgResponseTime.subtitle'),
          systemStatusTitle: t('overview.systemStatus.title'),
          systemStatusDescription: t('systemStatusDescription'),
          projectsHealthTitle: t('overview.systemStatus.projectsHealth.title'),
          projectsHealthDescription: t('overview.systemStatus.projectsHealth.description'),
          codeQualityTitle: t('overview.systemStatus.codeQuality.title'),
          codeQualityDescription: t('overview.systemStatus.codeQuality.description'),
          errorMonitoringTitle: t('overview.systemStatus.errorMonitoring.title'),
          errorMonitoringDescription: t('overview.systemStatus.errorMonitoring.description'),
          performanceTitle: t('overview.systemStatus.performance.title'),
          performanceDescription: t('overview.systemStatus.performance.description'),
          issuesLabel: t('overview.systemStatus.issues'),
          recentActivityTitle: t('overview.recentActivity.title'),
          recentActivityDescription: t('recentActivityDescription'),
          noRecentActivity: t('overview.recentActivity.noRecentActivity'),
          healthCheckPassed: t('overview.recentActivity.healthCheckPassed'),
        }}
      />
    </Section>
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
