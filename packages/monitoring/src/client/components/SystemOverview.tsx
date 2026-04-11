'use client'

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  H3,
  Icon,
  P,
  Progress,
} from '@ezstart/ui/components'
import type { KnownIconName } from '@ezstart/ui/components'
import { formatDistanceToNow } from 'date-fns'
import type { ReactNode } from 'react'

type IconName = KnownIconName

// --- Data interfaces (generic, no app-specific concepts) ---

export interface SystemOverviewProject {
  name?: string
  status?: string
  lastCheck?: string
  avgResponseTime?: number | null
}

export interface SystemOverviewAudit {
  score?: number | null
  name?: string
}

export interface SystemOverviewError {
  timestamp: string
  severity: string
  message: string
}

export interface SystemOverviewSummary {
  total: number
  healthy: number
  degraded: number
  unhealthy: number
}

export interface SystemOverviewProps {
  /** Project / service data */
  projects: SystemOverviewProject[]
  /** Audit data */
  audits: SystemOverviewAudit[]
  /** Error logs */
  errors: SystemOverviewError[]
  /** Summary counts */
  summary: SystemOverviewSummary
  /** Optional slot to render custom quick-action buttons (e.g., navigation links) */
  quickActions?: ReactNode
  /** Labels (provide your own for i18n). Falls back to English defaults. */
  labels?: Partial<SystemOverviewLabels>
}

export interface SystemOverviewLabels {
  globalHealthTitle: string
  globalHealthSubtitle: string
  servicesUptimeTitle: string
  servicesUptimeHealthy: string
  criticalErrorsTitle: string
  criticalErrorsSubtitle: string
  avgResponseTimeTitle: string
  avgResponseTimeSubtitle: string
  systemStatusTitle: string
  systemStatusDescription: string
  projectsHealthTitle: string
  projectsHealthDescription: string
  codeQualityTitle: string
  codeQualityDescription: string
  errorMonitoringTitle: string
  errorMonitoringDescription: string
  performanceTitle: string
  performanceDescription: string
  issuesLabel: string
  recentActivityTitle: string
  recentActivityDescription: string
  noRecentActivity: string
  healthCheckPassed: string
}

const DEFAULT_LABELS: SystemOverviewLabels = {
  globalHealthTitle: 'Global Health',
  globalHealthSubtitle: 'services monitored',
  servicesUptimeTitle: 'Services Uptime',
  servicesUptimeHealthy: 'healthy',
  criticalErrorsTitle: 'Critical Errors',
  criticalErrorsSubtitle: 'in the last 24h',
  avgResponseTimeTitle: 'Avg Response Time',
  avgResponseTimeSubtitle: 'across all services',
  systemStatusTitle: 'System Status',
  systemStatusDescription: 'Detailed breakdown of each monitoring dimension',
  projectsHealthTitle: 'Projects Health',
  projectsHealthDescription: 'services operational',
  codeQualityTitle: 'Code Quality',
  codeQualityDescription: 'audits evaluated',
  errorMonitoringTitle: 'Error Monitoring',
  errorMonitoringDescription: 'errors in last 24h',
  performanceTitle: 'Performance',
  performanceDescription: 'avg response time',
  issuesLabel: 'issues',
  recentActivityTitle: 'Recent Activity',
  recentActivityDescription: 'Latest events from monitoring systems',
  noRecentActivity: 'No recent activity',
  healthCheckPassed: 'Health check passed',
}

// --- Internal stat types ---

interface StatCard {
  title: string
  value: string | number
  subtitle: string
  icon: IconName
  variant: 'default' | 'success' | 'warning' | 'destructive'
  trend?: { value: number; isPositive: boolean }
}

interface SystemStatusItem {
  category: string
  score: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  issues: number
  icon: IconName
  description: string
}

// --- Helpers ---

function getStatusColor(
  status:
    | 'excellent'
    | 'good'
    | 'warning'
    | 'critical'
    | 'success'
    | 'error'
    | 'default'
    | 'destructive'
) {
  switch (status) {
    case 'excellent':
    case 'success':
    case 'default':
      return 'text-status-healthy'
    case 'good':
      return 'text-primary'
    case 'warning':
      return 'text-status-degraded'
    case 'critical':
    case 'error':
    case 'destructive':
      return 'text-destructive'
    default:
      return 'text-muted-foreground'
  }
}

function getStatusBadgeVariant(
  status: 'excellent' | 'good' | 'warning' | 'critical'
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'excellent':
      return 'default'
    case 'good':
      return 'secondary'
    case 'warning':
      return 'outline'
    case 'critical':
      return 'destructive'
  }
}

// --- Component ---

export function SystemOverview({
  projects,
  audits,
  errors,
  summary,
  quickActions,
  labels: customLabels,
}: SystemOverviewProps) {
  const labels = { ...DEFAULT_LABELS, ...customLabels }

  // Calculate stats
  const totalServices = projects.length
  const healthyServices = summary.healthy
  const uptimePercent = totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 0

  const avgAuditScore =
    audits.length > 0
      ? Math.round(audits.reduce((acc: number, a) => acc + (a.score || 0), 0) / audits.length)
      : 0

  // Filter recent errors (last 24h)
  const now = Date.now()
  const last24h = 24 * 60 * 60 * 1000
  const recentErrors = errors.filter(e => {
    const errorTime = new Date(e.timestamp).getTime()
    return now - errorTime <= last24h
  })

  const criticalErrors = recentErrors.filter(e => e.severity === 'critical').length

  // Average response time across all projects
  const projectsWithRT = projects.filter(p => p.avgResponseTime !== null)
  const avgResponseTime =
    projectsWithRT.length > 0
      ? Math.round(
          projectsWithRT.reduce((acc: number, p) => acc + (p.avgResponseTime || 0), 0) /
            projectsWithRT.length
        )
      : 0

  // Calculate global health score dynamically from sub-scores
  const errorScore = recentErrors.length === 0 ? 100 : Math.max(0, 100 - recentErrors.length * 5)
  const performanceScore = avgResponseTime < 200 ? 95 : avgResponseTime < 500 ? 80 : 60
  const globalHealthScore =
    Math.round(((uptimePercent + avgAuditScore + errorScore + performanceScore) / 4) * 10) / 10

  // Quick stats cards
  const stats: StatCard[] = [
    {
      title: labels.globalHealthTitle,
      value: `${globalHealthScore}/100`,
      subtitle: `${totalServices} ${labels.globalHealthSubtitle}`,
      icon: 'lucide:Activity',
      variant:
        globalHealthScore >= 90 ? 'success' : globalHealthScore >= 70 ? 'warning' : 'destructive',
    },
    {
      title: labels.servicesUptimeTitle,
      value: `${uptimePercent}%`,
      subtitle: `${healthyServices}/${totalServices} ${labels.servicesUptimeHealthy}`,
      icon: 'lucide:Server',
      variant: uptimePercent >= 90 ? 'success' : uptimePercent >= 70 ? 'warning' : 'destructive',
    },
    {
      title: labels.criticalErrorsTitle,
      value: criticalErrors,
      subtitle: labels.criticalErrorsSubtitle,
      icon: 'lucide:AlertTriangle',
      variant: criticalErrors === 0 ? 'success' : criticalErrors < 5 ? 'warning' : 'destructive',
      trend: criticalErrors === 0 ? { value: 100, isPositive: true } : undefined,
    },
    {
      title: labels.avgResponseTimeTitle,
      value: `${avgResponseTime}ms`,
      subtitle: labels.avgResponseTimeSubtitle,
      icon: 'lucide:Zap',
      variant:
        avgResponseTime < 200 ? 'success' : avgResponseTime < 500 ? 'warning' : 'destructive',
    },
  ]

  // System status breakdown
  const systemStatus: SystemStatusItem[] = [
    {
      category: labels.projectsHealthTitle,
      score: uptimePercent,
      status: uptimePercent >= 90 ? 'excellent' : uptimePercent >= 70 ? 'good' : 'warning',
      issues: summary.degraded + summary.unhealthy,
      icon: 'lucide:Boxes',
      description: `${healthyServices}/${totalServices} ${labels.projectsHealthDescription}`,
    },
    {
      category: labels.codeQualityTitle,
      score: avgAuditScore,
      status: avgAuditScore >= 90 ? 'excellent' : avgAuditScore >= 70 ? 'good' : 'warning',
      issues: audits.filter(a => (a.score ?? 0) < 80).length,
      icon: 'lucide:CheckCircle2',
      description: `${audits.length} ${labels.codeQualityDescription}`,
    },
    {
      category: labels.errorMonitoringTitle,
      score: recentErrors.length === 0 ? 100 : Math.max(0, 100 - recentErrors.length * 5),
      status:
        recentErrors.length === 0 ? 'excellent' : recentErrors.length < 10 ? 'good' : 'critical',
      issues: recentErrors.length,
      icon: 'lucide:Bug',
      description: `${recentErrors.length} ${labels.errorMonitoringDescription}`,
    },
    {
      category: labels.performanceTitle,
      score: avgResponseTime < 200 ? 95 : avgResponseTime < 500 ? 80 : 60,
      status: avgResponseTime < 200 ? 'excellent' : avgResponseTime < 500 ? 'good' : 'warning',
      issues: projects.filter(p => (p.avgResponseTime ?? 0) > 500).length,
      icon: 'lucide:Gauge',
      description: `${avgResponseTime}ms ${labels.performanceDescription}`,
    },
  ]

  // Recent activity
  const recentActivity = [
    ...projects.slice(0, 3).map(p => ({
      type: 'health_check' as const,
      message: `${labels.healthCheckPassed}: ${p.name}`,
      timestamp: p.lastCheck ?? new Date().toISOString(),
      status: p.status === 'healthy' ? ('success' as const) : ('warning' as const),
    })),
    ...recentErrors.slice(0, 2).map(e => ({
      type: 'error' as const,
      message: `${e.severity.toUpperCase()}: ${e.message.slice(0, 50)}...`,
      timestamp: e.timestamp,
      status: 'error' as const,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)

  return (
    <Div className="space-y-6">
      {/* Hero Stats Cards */}
      <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.title} variant="outline" className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <Div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon name={stat.icon} className={`w-4 h-4 ${getStatusColor(stat.variant)}`} />
              </Div>
            </CardHeader>
            <CardContent>
              <Div className="flex items-baseline justify-between">
                <P className="text-3xl font-bold">{stat.value}</P>
                {stat.trend && (
                  <Badge
                    variant={stat.trend.isPositive ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    <Icon
                      name={stat.trend.isPositive ? 'lucide:TrendingUp' : 'lucide:TrendingDown'}
                      className="w-3 h-3 mr-1"
                    />
                    {stat.trend.value > 0 ? '+' : ''}
                    {stat.trend.value}
                  </Badge>
                )}
              </Div>
              <P className="text-xs text-muted-foreground mt-1">{stat.subtitle}</P>
            </CardContent>
          </Card>
        ))}
      </Div>

      {/* System Status Grid */}
      <Card variant="outline">
        <CardHeader>
          <CardTitle>{labels.systemStatusTitle}</CardTitle>
          <CardDescription>{labels.systemStatusDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Div className="space-y-4">
            {systemStatus.map(item => (
              <Div key={item.category} className="space-y-2">
                <Div className="flex items-center justify-between">
                  <Div className="flex items-center gap-2">
                    <Icon name={item.icon} className={`w-4 h-4 ${getStatusColor(item.status)}`} />
                    <H3 className="text-sm font-medium">{item.category}</H3>
                  </Div>
                  <Div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs">
                      {item.status.toUpperCase()}
                    </Badge>
                    <P className="text-sm font-semibold">{item.score}/100</P>
                  </Div>
                </Div>
                <Progress value={item.score} className="h-2" />
                <Div className="flex items-center justify-between text-xs text-muted-foreground">
                  <P>{item.description}</P>
                  {item.issues > 0 && (
                    <P className="text-destructive font-medium">
                      {item.issues} {labels.issuesLabel}
                    </P>
                  )}
                </Div>
              </Div>
            ))}
          </Div>
        </CardContent>
      </Card>

      <Div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card variant="outline">
          <CardHeader>
            <Div className="flex items-center justify-between">
              <Div>
                <CardTitle>{labels.recentActivityTitle}</CardTitle>
                <CardDescription>{labels.recentActivityDescription}</CardDescription>
              </Div>
              <Icon name="lucide:Activity" className="w-4 h-4 text-muted-foreground" />
            </Div>
          </CardHeader>
          <CardContent>
            <Div className="space-y-3">
              {recentActivity.map((activity, idx) => (
                <Div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <Icon
                    name={
                      activity.type === 'health_check'
                        ? 'lucide:CheckCircle2'
                        : 'lucide:AlertCircle'
                    }
                    className={`w-4 h-4 mt-0.5 ${getStatusColor(activity.status)}`}
                  />
                  <Div className="flex-1 min-w-0">
                    <P className="text-sm">{activity.message}</P>
                    <P className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </P>
                  </Div>
                </Div>
              ))}
              {recentActivity.length === 0 && (
                <P className="text-sm text-muted-foreground text-center py-4">
                  {labels.noRecentActivity}
                </P>
              )}
            </Div>
          </CardContent>
        </Card>

        {/* Quick Actions (app-specific, passed as children) */}
        {quickActions}
      </Div>
    </Div>
  )
}
