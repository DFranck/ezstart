'use client'

import { Card, CardContent, H3, P } from '@ezstart/ui/components'

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
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <P className="text-sm text-muted-foreground">{title}</P>
            <div className="flex items-baseline gap-2">
              {icon && <span className="text-2xl">{icon}</span>}
              <H3 size="h2" className="font-bold">
                {value}
              </H3>
            </div>
            {subtitle && <P className="text-xs text-muted-foreground">{subtitle}</P>}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 ${getTrendColor()}`}>
              <span className="text-2xl">{getTrendIcon()}</span>
              <P className="text-sm font-semibold">{Math.abs(trend.value)}%</P>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface MetricsOverviewProps {
  activeTab: 'projects' | 'audits' | 'activity'
  metrics: {
    servicesHealthy: number
    servicesTotal: number
    auditsComplete: number
    auditsTotal: number
    deploymentsActive: number
    deploymentsTotal: number
    avgResponseTime: number
    worstAuditName?: string
  }
}

export function MetricsOverview({ activeTab, metrics }: MetricsOverviewProps) {
  const servicesHealthPercentage = Math.round(
    (metrics.servicesHealthy / metrics.servicesTotal) * 100
  )
  const auditsCompletePercentage = Math.round((metrics.auditsComplete / metrics.auditsTotal) * 100)

  if (activeTab === 'projects') {
    return (
      <div className="md:grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg hidden">
        <MetricCard
          title="Projects Health"
          value={`${metrics.servicesHealthy}/${metrics.servicesTotal}`}
          subtitle={`${servicesHealthPercentage}% operational`}
          icon="🚀"
        />

        <MetricCard
          title="Avg Response Time"
          value={`${metrics.avgResponseTime}ms`}
          subtitle="Last 24 hours"
          icon="⚡"
        />
      </div>
    )
  }

  if (activeTab === 'audits') {
    const worstAuditLabel = metrics.worstAuditName
      ? metrics.worstAuditName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'N/A'

    const passingPercentage = Math.round((metrics.servicesHealthy / metrics.servicesTotal) * 100)

    return (
      <div className="md:grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg hidden">
        <MetricCard
          title="Passing Audits"
          value={`${metrics.servicesHealthy}/${metrics.servicesTotal}`}
          subtitle={`${passingPercentage}% passing (≥80/100)`}
          icon="✅"
        />

        <MetricCard
          title="Lowest Score"
          value={`${metrics.avgResponseTime}/100`}
          subtitle={worstAuditLabel}
          icon="⚠️"
        />
      </div>
    )
  }

  // Activity tab - no metrics
  return null
}
