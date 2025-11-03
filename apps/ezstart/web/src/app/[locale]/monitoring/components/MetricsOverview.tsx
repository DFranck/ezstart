'use client'

import { Card, CardContent, Div, H3, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
}

function MetricCard({ title, value, subtitle, icon, trend }: MetricCardProps) {
  const getTrendColor = () => {
    if (!trend) return ''
    return trend.direction === 'up' ? 'text-status-healthy' : 'text-status-unhealthy'
  }

  const getTrendIcon = () => {
    if (!trend) return null
    return trend.direction === 'up' ? '↑' : '↓'
  }

  return (
    <Card variant="floating" className="hover:border-primary/50 transition-colors">
      <CardContent>
        <Div layout={'center'}>
          <P className="text-sm text-muted-foreground">{title}</P>
          <div className="flex items-baseline gap-2">
            {icon && <span className="text-2xl">{icon}</span>}
            <H3 size="h2" className="font-bold">
              {value}
            </H3>
          </div>
          {subtitle && <P className="text-xs text-muted-foreground">{subtitle}</P>}
        </Div>
        {trend && (
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            <span className="text-2xl">{getTrendIcon()}</span>
            <P className="text-sm font-semibold">{Math.abs(trend.value)}%</P>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface MetricsOverviewProps {
  activeTab: 'projects' | 'audits' | 'errors'
  metrics: {
    servicesHealthy: number
    servicesTotal: number
    auditsComplete: number
    auditsTotal: number
    deploymentsActive: number
    deploymentsTotal: number
    avgResponseTime: number
    worstAuditName?: string
    worstProjectName?: string
  }
}

export function MetricsOverview({ activeTab, metrics }: MetricsOverviewProps) {
  const t = useTranslations('monitoring.metrics')

  const servicesHealthPercentage = Math.round(
    (metrics.servicesHealthy / metrics.servicesTotal) * 100
  )
  const auditsCompletePercentage = Math.round((metrics.auditsComplete / metrics.auditsTotal) * 100)

  if (activeTab === 'projects') {
    return (
      <Div layout="grid" className="lg:grid-cols-1">
        <MetricCard
          title={t('projectsHealth.title')}
          value={`${metrics.servicesHealthy}/${metrics.servicesTotal}`}
          subtitle={`${servicesHealthPercentage}% ${t('projectsHealth.operational')}`}
          icon="🚀"
        />

        <MetricCard
          title={t('avgResponseTime.title')}
          value={`${metrics.avgResponseTime}ms`}
          subtitle={t('avgResponseTime.subtitle')}
          icon="⚡"
        />
      </Div>
    )
  }

  if (activeTab === 'audits') {
    const worstAuditLabel = metrics.worstAuditName || 'N/A'
    const passingPercentage = Math.round((metrics.servicesHealthy / metrics.servicesTotal) * 100)

    return (
      <Div layout="grid" className="lg:grid-cols-1">
        {' '}
        <MetricCard
          title={t('passingAudits.title')}
          value={`${metrics.servicesHealthy}/${metrics.servicesTotal}`}
          subtitle={`${passingPercentage}% ${t('passingAudits.passing')} (${t('passingAudits.target')})`}
          icon="✅"
        />
        <MetricCard
          title={t('lowestScore.title')}
          value={`${metrics.avgResponseTime}/100`}
          subtitle={worstAuditLabel}
          icon="⚠️"
        />
      </Div>
    )
  }

  // Errors tab
  if (activeTab === 'errors') {
    const totalErrors = metrics.servicesHealthy // Total errors count
    const criticalAndErrors = metrics.servicesTotal // Critical + errors count
    const worstProjectName = metrics.worstProjectName || t('mostAffectedProject.none')
    const worstProjectCount = metrics.deploymentsActive

    return (
      <Div layout="grid" className="lg:grid-cols-1">
        {' '}
        <MetricCard
          title={t('totalErrors.title')}
          value={totalErrors}
          subtitle={`${criticalAndErrors} ${t('totalErrors.criticalErrors')}`}
          icon="🔴"
        />
        <MetricCard
          title={t('mostAffectedProject.title')}
          value={worstProjectCount > 0 ? worstProjectCount : '-'}
          subtitle={worstProjectName}
          icon="⚠️"
        />
      </Div>
    )
  }

  return null
}
