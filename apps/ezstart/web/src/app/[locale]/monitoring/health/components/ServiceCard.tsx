'use client'

import { Card, CardHeader, CardContent, Badge, Div, H3, P } from '@ezstart/ui/components'
import type { HealthCheckResult } from '@ezstart/monitoring'
import { useTranslations } from 'next-intl'

interface ServiceCardProps {
  service: HealthCheckResult & {
    id: string
    name: string
    type: 'api' | 'web'
  }
}

export function ServiceCard({ service }: ServiceCardProps) {
  const t = useTranslations('monitoring')
  const isHealthy = service.status === 'healthy'
  const statusColor = isHealthy
    ? 'bg-status-healthy/10 text-status-healthy border-status-healthy/20'
    : 'bg-status-unhealthy/10 text-status-unhealthy border-status-unhealthy/20'

  return (
    <Card variant="floating" className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <Div className="flex items-start justify-between">
          <Div>
            <H3 size="h5" className="mb-1">
              {service.name}
            </H3>
            <Badge variant="outline" className="text-xs">
              {service.type.toUpperCase()}
            </Badge>
          </Div>
          <Badge className={statusColor}>{service.status}</Badge>
        </Div>
      </CardHeader>
      <CardContent>
        <Div className="space-y-2">
          <Div className="flex items-center justify-between text-sm">
            <P className="text-muted-foreground">{t('responseTime')}</P>
            <P className="font-medium">
              {service.responseTime ? `${service.responseTime}ms` : 'N/A'}
            </P>
          </Div>
          {service.error && (
            <Div className="mt-3 p-2 bg-destructive/10 rounded-md">
              <P className="text-xs text-destructive">{service.error}</P>
            </Div>
          )}
        </Div>
      </CardContent>
    </Card>
  )
}
