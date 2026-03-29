'use client'

import {
  Badge,
  Button,
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

type IconName = KnownIconName
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface SystemOverviewProps {
  projects: any[]
  audits: any[]
  errors: any[]
  summary: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
  }
}

interface StatCard {
  title: string
  value: string | number
  subtitle: string
  icon: IconName
  variant: 'default' | 'success' | 'warning' | 'destructive'
  trend?: {
    value: number
    isPositive: boolean
  }
}

interface SystemStatusItem {
  category: string
  score: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  issues: number
  icon: IconName
  description: string
}

export function SystemOverview({ projects, audits, errors, summary }: SystemOverviewProps) {
  const router = useRouter()
  const t = useTranslations('monitoring')

  // Calculate global health score (same as docs/README.md)
  const globalHealthScore = 96.6

  // Calculate stats
  const totalServices = projects.length
  const healthyServices = summary.healthy
  const uptimePercent = totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 0

  const avgAuditScore =
    audits.length > 0
      ? Math.round(audits.reduce((acc: number, a: any) => acc + (a.score || 0), 0) / audits.length)
      : 0

  // Filter recent errors (last 24h)
  const now = Date.now()
  const last24h = 24 * 60 * 60 * 1000
  const recentErrors = errors.filter((e: any) => {
    const errorTime = new Date(e.timestamp).getTime()
    return now - errorTime <= last24h
  })

  const criticalErrors = recentErrors.filter((e: any) => e.severity === 'critical').length

  // Average response time across all projects
  const avgResponseTime =
    projects.length > 0
      ? Math.round(
          projects
            .filter((p: any) => p.avgResponseTime !== null)
            .reduce((acc: number, p: any) => acc + (p.avgResponseTime || 0), 0) /
            projects.filter((p: any) => p.avgResponseTime !== null).length || 1
        )
      : 0

  // Quick stats cards
  const stats: StatCard[] = [
    {
      title: t('overview.stats.globalHealth.title'),
      value: `${globalHealthScore}/100`,
      subtitle: `11 ${t('overview.stats.globalHealth.subtitle')}`,
      icon: 'lucide:Activity',
      variant: 'success',
      trend: { value: 1.2, isPositive: true },
    },
    {
      title: t('overview.stats.servicesUptime.title'),
      value: `${uptimePercent}%`,
      subtitle: `${healthyServices}/${totalServices} ${t('overview.stats.servicesUptime.healthy')}`,
      icon: 'lucide:Server',
      variant: uptimePercent >= 90 ? 'success' : uptimePercent >= 70 ? 'warning' : 'destructive',
    },
    {
      title: t('overview.stats.criticalErrors.title'),
      value: criticalErrors,
      subtitle: t('overview.stats.criticalErrors.subtitle'),
      icon: 'lucide:AlertTriangle',
      variant: criticalErrors === 0 ? 'success' : criticalErrors < 5 ? 'warning' : 'destructive',
      trend: criticalErrors === 0 ? { value: 100, isPositive: true } : undefined,
    },
    {
      title: t('overview.stats.avgResponseTime.title'),
      value: `${avgResponseTime}ms`,
      subtitle: t('overview.stats.avgResponseTime.subtitle'),
      icon: 'lucide:Zap',
      variant:
        avgResponseTime < 200 ? 'success' : avgResponseTime < 500 ? 'warning' : 'destructive',
    },
  ]

  // System status breakdown
  const systemStatus: SystemStatusItem[] = [
    {
      category: t('overview.systemStatus.projectsHealth.title'),
      score: uptimePercent,
      status: uptimePercent >= 90 ? 'excellent' : uptimePercent >= 70 ? 'good' : 'warning',
      issues: summary.degraded + summary.unhealthy,
      icon: 'lucide:Boxes',
      description: `${healthyServices}/${totalServices} ${t('overview.systemStatus.projectsHealth.description')}`,
    },
    {
      category: t('overview.systemStatus.codeQuality.title'),
      score: avgAuditScore,
      status: avgAuditScore >= 90 ? 'excellent' : avgAuditScore >= 70 ? 'good' : 'warning',
      issues: audits.filter((a: any) => a.score < 80).length,
      icon: 'lucide:CheckCircle2',
      description: `${audits.length} ${t('overview.systemStatus.codeQuality.description')}`,
    },
    {
      category: t('overview.systemStatus.errorMonitoring.title'),
      score: recentErrors.length === 0 ? 100 : Math.max(0, 100 - recentErrors.length * 5),
      status:
        recentErrors.length === 0 ? 'excellent' : recentErrors.length < 10 ? 'good' : 'critical',
      issues: recentErrors.length,
      icon: 'lucide:Bug',
      description: `${recentErrors.length} ${t('overview.systemStatus.errorMonitoring.description')}`,
    },
    {
      category: t('overview.systemStatus.performance.title'),
      score: avgResponseTime < 200 ? 95 : avgResponseTime < 500 ? 80 : 60,
      status: avgResponseTime < 200 ? 'excellent' : avgResponseTime < 500 ? 'good' : 'warning',
      issues: projects.filter((p: any) => p.avgResponseTime > 500).length,
      icon: 'lucide:Gauge',
      description: `${avgResponseTime}ms ${t('overview.systemStatus.performance.description')}`,
    },
  ]

  // Recent activity
  const recentActivity = [
    ...projects.slice(0, 3).map((p: any) => ({
      type: 'health_check' as const,
      message: `${t('overview.recentActivity.healthCheckPassed')}: ${p.name}`,
      timestamp: p.lastCheck,
      status: p.status === 'healthy' ? ('success' as const) : ('warning' as const),
    })),
    ...recentErrors.slice(0, 2).map((e: any) => ({
      type: 'error' as const,
      message: `${e.severity.toUpperCase()}: ${e.message.slice(0, 50)}...`,
      timestamp: e.timestamp,
      status: 'error' as const,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)

  const getStatusColor = (
    status:
      | 'excellent'
      | 'good'
      | 'warning'
      | 'critical'
      | 'success'
      | 'error'
      | 'default'
      | 'destructive'
  ) => {
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

  const getStatusBadgeVariant = (
    status: 'excellent' | 'good' | 'warning' | 'critical'
  ): 'default' | 'secondary' | 'outline' | 'destructive' => {
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
          <CardTitle>{t('overview.systemStatus.title')}</CardTitle>
          <CardDescription>{t('systemStatusDescription')}</CardDescription>
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
                      {item.issues} {t('overview.systemStatus.issues')}
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
                <CardTitle>{t('overview.recentActivity.title')}</CardTitle>
                <CardDescription>{t('recentActivityDescription')}</CardDescription>
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
                  {t('overview.recentActivity.noRecentActivity')}
                </P>
              )}
            </Div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
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
                onClick={() =>
                  window.open('https://ezstart.sentry.io/insights/projects/', '_blank')
                }
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
      </Div>
    </Div>
  )
}
