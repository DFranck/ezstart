'use client'

import { Badge, Card, CardHeader, Div, Icon, P, Span } from '@ezstart/ui/components'

export interface ErrorLogData {
  /** Unique identifier */
  id: string
  /** Severity level */
  severity: 'critical' | 'error' | 'warning'
  /** Error title/summary */
  title: string
  /** Detailed error message */
  message: string
  /** Source of the error (e.g., "Sentry", "API") */
  source: string
  /** Project name where error occurred */
  project?: string
  /** When the error occurred (ISO string) */
  timestamp: string
  /** Additional metadata */
  metadata?: {
    count?: number
    userCount?: number
    stackTrace?: string
  }
  /** External URL to view full error details */
  url?: string
}

export interface ErrorCardProps {
  /** Error log data */
  log: ErrorLogData
  /** Labels for severity levels */
  severityLabels?: {
    critical?: string
    error?: string
    warning?: string
  }
  /** Label for "View" link */
  viewLabel?: string
  /** Custom time-ago formatter. If not provided, uses basic English formatting. */
  formatTimeAgo?: (timestamp: string) => string
}

const DEFAULT_SEVERITY_LABELS = {
  critical: 'Critical',
  error: 'Error',
  warning: 'Warning',
}

function defaultFormatTimeAgo(timestamp: string): string {
  const now = new Date()
  const ts = new Date(timestamp)
  const diffMs = now.getTime() - ts.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMins > 0) return `${diffMins}m ago`
  return 'Just now'
}

export function ErrorCard({
  log,
  severityLabels,
  viewLabel = 'View',
  formatTimeAgo,
}: ErrorCardProps) {
  const labels = { ...DEFAULT_SEVERITY_LABELS, ...severityLabels }
  const timeAgo = (formatTimeAgo ?? defaultFormatTimeAgo)(log.timestamp)

  const severityConfig = {
    critical: {
      bg: 'bg-destructive/10',
      border: 'border-destructive',
      icon: 'lucide:AlertOctagon' as const,
      iconColor: 'text-destructive',
    },
    error: {
      bg: 'bg-destructive/10',
      border: 'border-destructive',
      icon: 'lucide:XCircle' as const,
      iconColor: 'text-destructive',
    },
    warning: {
      bg: 'bg-status-degraded/10',
      border: 'border-status-degraded',
      icon: 'lucide:AlertTriangle' as const,
      iconColor: 'text-status-degraded',
    },
  }

  const config = severityConfig[log.severity]

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
                  {labels[log.severity]}
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
                      {log.metadata.count} occurrences
                    </Badge>
                  )}
                  {log.metadata.userCount && (
                    <Badge variant="outline" className="text-xs">
                      {log.metadata.userCount} users affected
                    </Badge>
                  )}
                </Div>
              )}
            </Div>
          </Div>
          {log.url && (
            <Span className="text-primary text-sm flex items-center gap-1 shrink-0">
              <a
                href={log.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline flex items-center gap-1"
              >
                {viewLabel}
                <Icon name="lucide:ExternalLink" className="w-4 h-4" />
              </a>
            </Span>
          )}
        </Div>
      </CardHeader>
    </Card>
  )
}
