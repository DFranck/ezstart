'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H3,
  Icon,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useMonitoringErrors, type ErrorLog } from '../../hooks'

export function ErrorsFeed() {
  const t = useTranslations('monitoring')
  const tErrors = useTranslations('monitoring.errors')
  const { data, isLoading, error, refetch, isFetching } = useMonitoringErrors()

  const errorLogs = data?.logs || []

  if (isLoading) {
    return (
      <Div className="flex flex-col items-center justify-center py-12 gap-4">
        <Spinner size="lg" text={tErrors('loading')} />
      </Div>
    )
  }

  if (error) {
    return (
      <Card variant="ghost">
        <CardContent className="py-12">
          <Div className="flex flex-col items-center gap-4 text-center">
            <Icon name="lucide:AlertTriangle" className="w-12 h-12 text-destructive" />
            <P className="text-destructive font-semibold">{t('failedToLoadErrors')}</P>
            <P className="text-muted-foreground text-sm">
              {error instanceof Error ? error.message : t('unknownError')}
            </P>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              {t('retry')}
            </Button>
          </Div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Div className="space-y-4">
      {/* Header */}
      <Div className="flex items-center justify-between">
        <Div>
          <H3>{t('errorLogs')}</H3>
          <P className="text-sm text-muted-foreground">{t('errorLogsDescription')}</P>
        </Div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isFetching}
        >
          <Icon name="lucide:RefreshCw" className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? t('refreshing') : t('retry')}
        </Button>
      </Div>

      {/* Error Cards */}
      {errorLogs.length === 0 ? (
        <Card variant="ghost">
          <CardContent className="py-12">
            <Div className="flex flex-col items-center gap-2 text-center">
              <Icon name="lucide:CheckCircle" className="w-12 h-12 text-status-healthy" />
              <P className="text-status-healthy font-semibold">{t('allClear')}</P>
              <P className="text-sm text-muted-foreground">{t('allSystemsOperational')}</P>
            </Div>
          </CardContent>
        </Card>
      ) : (
        <Div className="space-y-3">
          {errorLogs.map(log => (
            <ErrorCard key={log.id} log={log} />
          ))}
        </Div>
      )}
    </Div>
  )
}

/**
 * Error Card Component
 */
function ErrorCard({ log }: { log: ErrorLog }) {
  const t = useTranslations('monitoring')

  const severityConfig = {
    critical: {
      bg: 'bg-destructive/10',
      border: 'border-destructive',
      icon: 'lucide:AlertOctagon',
      iconColor: 'text-destructive',
      label: t('severity.critical'),
    },
    error: {
      bg: 'bg-destructive/10',
      border: 'border-destructive',
      icon: 'lucide:XCircle',
      iconColor: 'text-destructive',
      label: t('severity.error'),
    },
    warning: {
      bg: 'bg-status-degraded/10',
      border: 'border-status-degraded',
      icon: 'lucide:AlertTriangle',
      iconColor: 'text-status-degraded',
      label: t('severity.warning'),
    },
  } as const

  const config = severityConfig[log.severity]

  // Format timestamp
  const timestamp = new Date(log.timestamp)
  const now = new Date()
  const diffMs = now.getTime() - timestamp.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  let timeAgo = ''
  if (diffDays > 0) timeAgo = t('timeAgo.daysAgo', { count: diffDays })
  else if (diffHours > 0) timeAgo = t('timeAgo.hoursAgo', { count: diffHours })
  else if (diffMins > 0) timeAgo = t('timeAgo.minutesAgo', { count: diffMins })
  else timeAgo = t('timeAgo.justNow')

  return (
    <Card variant="default" className={`${config.bg} ${config.border} border-l-4`}>
      <CardHeader>
        <Div className="flex items-start justify-between gap-3">
          <Div className="flex items-start gap-3 flex-1">
            <Icon name={config.icon} className={`w-5 h-5 ${config.iconColor} mt-0.5`} />
            <Div className="flex-1 min-w-0">
              <Div className="flex items-center gap-2 mb-1 flex-wrap">
                <P className="font-semibold text-sm">{log.title}</P>
                <Badge variant="destructive" className="text-xs">
                  {config.label}
                </Badge>
              </Div>
              <P className="text-sm text-muted-foreground mb-2">{log.message}</P>

              {/* Metadata */}
              <Div className="flex items-center gap-3 flex-wrap">
                <P className="text-xs text-muted-foreground">
                  <Icon name="lucide:Server" className="w-3 h-3 inline mr-1" />
                  {log.source}
                </P>
                {log.project && (
                  <P className="text-xs text-muted-foreground">
                    <Icon name="lucide:FolderOpen" className="w-3 h-3 inline mr-1" />
                    {log.project}
                  </P>
                )}
                <P className="text-xs text-muted-foreground">
                  <Icon name="lucide:Clock" className="w-3 h-3 inline mr-1" />
                  {timeAgo}
                </P>
              </Div>

              {/* Additional metadata */}
              {log.metadata && (
                <Div className="flex flex-wrap gap-2 mt-2">
                  {log.metadata.count && (
                    <Badge variant="outline" className="text-xs">
                      {t('occurrences', { count: log.metadata.count })}
                    </Badge>
                  )}
                  {log.metadata.userCount && (
                    <Badge variant="outline" className="text-xs">
                      {t('usersAffected', { count: log.metadata.userCount })}
                    </Badge>
                  )}
                </Div>
              )}
            </Div>
          </Div>
          {log.url && (
            <Link
              href={log.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm flex items-center gap-1 shrink-0"
            >
              {t('view')}
              <Icon name="lucide:ExternalLink" className="w-4 h-4" />
            </Link>
          )}
        </Div>
      </CardHeader>
    </Card>
  )
}
