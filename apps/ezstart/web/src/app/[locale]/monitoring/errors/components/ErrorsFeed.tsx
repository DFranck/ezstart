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
  Spinner,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useMonitoringErrors, type ErrorLog } from '../../hooks'

export function ErrorsFeed() {
  const t = useTranslations('monitoring.errors')
  const { data, isLoading, error, refetch, isFetching } = useMonitoringErrors()

  const errorLogs = data?.logs || []

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Spinner size="lg" text={t('loading')} />
      </div>
    )
  }

  if (error) {
    return (
      <Card variant="ghost">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Icon name="lucide:AlertTriangle" className="w-12 h-12 text-destructive" />
            <P className="text-destructive font-semibold">Failed to load error logs</P>
            <P className="text-muted-foreground text-sm">
              {error instanceof Error ? error.message : 'Unknown error'}
            </P>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Div>
          <H3>Error Logs</H3>
          <P className="text-sm text-muted-foreground">
            Recent errors captured from all projects (Sentry integration)
          </P>
        </Div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isFetching}
        >
          <Icon
            name="lucide:RefreshCw"
            className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
          />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Error Cards */}
      {errorLogs.length === 0 ? (
        <Card variant="ghost">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-2 text-center">
              <Icon name="lucide:CheckCircle" className="w-12 h-12 text-status-healthy" />
              <P className="text-status-healthy font-semibold">All Clear!</P>
              <P className="text-sm text-muted-foreground">No errors detected. All systems operational 🎉</P>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {errorLogs.map((log) => (
            <ErrorCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Error Card Component
 */
function ErrorCard({ log }: { log: ErrorLog }) {
  const severityConfig = {
    critical: {
      bg: 'bg-destructive/10',
      border: 'border-destructive',
      icon: 'lucide:AlertOctagon',
      iconColor: 'text-destructive',
      label: 'Critical',
    },
    error: {
      bg: 'bg-destructive/10',
      border: 'border-destructive',
      icon: 'lucide:XCircle',
      iconColor: 'text-destructive',
      label: 'Error',
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500',
      icon: 'lucide:AlertTriangle',
      iconColor: 'text-yellow-600 dark:text-yellow-500',
      label: 'Warning',
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
  if (diffDays > 0) timeAgo = `${diffDays}d ago`
  else if (diffHours > 0) timeAgo = `${diffHours}h ago`
  else if (diffMins > 0) timeAgo = `${diffMins}m ago`
  else timeAgo = 'Just now'

  return (
    <Card variant="default" className={`${config.bg} ${config.border} border-l-4`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Icon name={config.icon} className={`w-5 h-5 ${config.iconColor} mt-0.5`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <P className="font-semibold text-sm">{log.title}</P>
                <Badge variant="destructive" className="text-xs">
                  {config.label}
                </Badge>
              </div>
              <P className="text-sm text-muted-foreground mb-2">{log.message}</P>

              {/* Metadata */}
              <div className="flex items-center gap-3 flex-wrap">
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
              </div>

              {/* Additional metadata */}
              {log.metadata && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {log.metadata.count && (
                    <Badge variant="outline" className="text-xs">
                      {log.metadata.count} occurrences
                    </Badge>
                  )}
                  {log.metadata.userCount && (
                    <Badge variant="outline" className="text-xs">
                      {log.metadata.userCount} users affected
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          {log.url && (
            <a
              href={log.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm flex items-center gap-1 shrink-0"
            >
              View
              <Icon name="lucide:ExternalLink" className="w-4 h-4" />
            </a>
          )}
        </div>
      </CardHeader>
    </Card>
  )
}
