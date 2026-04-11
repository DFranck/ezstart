'use client'

import { Card, CardHeader, CardContent, Badge, Div, H3, P } from '@ezstart/ui/components'

export interface ServiceStatusCardProps {
  /** Service display name */
  name: string
  /** Service type label */
  type: string
  /** Current health status */
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  /** Response time in ms (null if unavailable) */
  responseTime: number | null
  /** Error message if unhealthy */
  error?: string | null
  /** Label for response time field */
  responseTimeLabel?: string
}

export function ServiceStatusCard({
  name,
  type,
  status,
  responseTime,
  error,
  responseTimeLabel = 'Response Time',
}: ServiceStatusCardProps) {
  const statusColor =
    status === 'healthy'
      ? 'bg-status-healthy/10 text-status-healthy border-status-healthy/20'
      : status === 'degraded'
        ? 'bg-status-degraded/10 text-status-degraded border-status-degraded/20'
        : status === 'unhealthy'
          ? 'bg-status-unhealthy/10 text-status-unhealthy border-status-unhealthy/20'
          : 'bg-status-unknown/10 text-status-unknown border-status-unknown/20'

  return (
    <Card variant="floating" className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <Div className="flex items-start justify-between">
          <Div>
            <H3 size="h5" className="mb-1">
              {name}
            </H3>
            <Badge variant="outline" className="text-xs">
              {type.toUpperCase()}
            </Badge>
          </Div>
          <Badge className={statusColor}>{status}</Badge>
        </Div>
      </CardHeader>
      <CardContent>
        <Div className="space-y-2">
          <Div className="flex items-center justify-between text-sm">
            <P className="text-muted-foreground">{responseTimeLabel}</P>
            <P className="font-medium">{responseTime ? `${responseTime}ms` : 'N/A'}</P>
          </Div>
          {error && (
            <Div className="mt-3 p-2 bg-destructive/10 rounded-md">
              <P className="text-xs text-destructive">{error}</P>
            </Div>
          )}
        </Div>
      </CardContent>
    </Card>
  )
}
