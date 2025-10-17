'use client'

import { Card, CardHeader, CardContent, Badge, H3, P } from '@ezstart/ui/components'
import type { HealthCheckResult } from '@ezstart/monitoring'

interface ServiceCardProps {
  service: HealthCheckResult & {
    id: string
    name: string
    type: 'api' | 'web'
  }
}

export function ServiceCard({ service }: ServiceCardProps) {
  const isHealthy = service.status === 'healthy'
  const statusColor = isHealthy
    ? 'bg-status-healthy/10 text-status-healthy border-status-healthy/20'
    : 'bg-status-unhealthy/10 text-status-unhealthy border-status-unhealthy/20'

  return (
    <Card variant="floating" className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <H3 size="h5" className="mb-1">
              {service.name}
            </H3>
            <Badge variant="outline" className="text-xs">
              {service.type.toUpperCase()}
            </Badge>
          </div>
          <Badge className={statusColor}>
            {service.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <P className="text-muted-foreground">Response Time</P>
            <P className="font-medium">
              {service.responseTime ? `${service.responseTime}ms` : 'N/A'}
            </P>
          </div>
          {service.uptime !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">Uptime (24h)</P>
              <P className="font-medium">{service.uptime.toFixed(1)}%</P>
            </div>
          )}
          {service.avgResponseTime !== undefined && service.avgResponseTime !== null && (
            <div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">Avg Response</P>
              <P className="font-medium">{service.avgResponseTime.toFixed(0)}ms</P>
            </div>
          )}
          {service.error && (
            <div className="mt-3 p-2 bg-destructive/10 rounded-md">
              <P className="text-xs text-destructive">{service.error}</P>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
