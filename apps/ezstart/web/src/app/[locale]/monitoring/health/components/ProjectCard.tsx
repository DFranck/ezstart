'use client'

import { logger } from '@ezstart/logger'
import type { ProjectHealth } from '@ezstart/monitoring'
import type { UptimeDataPoint } from '@ezstart/ui/components'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Div,
  H3,
  Icon,
  Img,
  P,
  Span,
  UptimeGraph,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { useQuery } from '@tanstack/react-query'
import { callApi } from '@/config/api'
import Link from 'next/link'

interface ProjectCardProps {
  project: ProjectHealth
  isSelected?: boolean
}

interface ServiceHistory {
  serviceId: string
  totalChecks: number
  healthyChecks: number
  uptimePercentage: number
  avgResponseTime: number | null
  history: UptimeDataPoint[]
}

export function ProjectCard({ project, isSelected }: ProjectCardProps) {
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['monitoring', 'project-history', project.id],
    queryFn: async () => {
      const res = await callApi<{ services: ServiceHistory[] }>(`/history/project/${project.id}`, {
        query: { hours: 24 },
      })
      return res.services || []
    },
    staleTime: 60000,
    refetchInterval: 300000,
  })

  const servicesHistory = historyData ?? []

  const getGithubUrlForEndpoint = (endpointType: string) => {
    if (!project.githubUrl) return null
    // Si le githubUrl pointe deja vers un sous-dossier (api ou web), le retourner tel quel
    if (project.githubUrl.includes('/api') || project.githubUrl.includes('/web')) {
      return project.githubUrl
    }
    // Sinon, ajouter /api ou /web selon le type
    return `${project.githubUrl}/${endpointType}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-status-healthy/10 text-status-healthy border-status-healthy/20'
      case 'degraded':
        return 'bg-status-degraded/10 text-status-degraded border-status-degraded/20'
      case 'unhealthy':
        return 'bg-status-unhealthy/10 text-status-unhealthy border-status-unhealthy/20'
      default:
        return 'bg-status-unknown/10 text-status-unknown border-status-unknown/20'
    }
  }

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'healthy':
        return '🟢'
      case 'degraded':
        return '🟡'
      case 'unhealthy':
        return '🔴'
      default:
        return '⚪'
    }
  }

  const getPlatformBadge = (platform?: string) => {
    if (!platform) return null

    const colors: Record<string, string> = {
      railway: 'bg-platform-railway/10 text-platform-railway',
      render: 'bg-platform-render/10 text-platform-render',
      vercel: 'bg-platform-vercel/10 text-platform-vercel',
    }

    return (
      <Badge variant="outline" className={`text-xs ${colors[platform] || ''}`}>
        {platform}
      </Badge>
    )
  }

  return (
    <Card variant="floating" className={cn('transition-all', isSelected && 'ring-2 ring-primary')}>
      <CardHeader>
        <Div className="flex items-start justify-between">
          <Div className="flex items-center gap-3">
            {/* Logo or Emoji */}
            {project.logo ? (
              <Img
                src={project.logo}
                alt={`${project.name} logo`}
                className="w-10 h-10 object-contain rounded-md"
              />
            ) : (
              <Span className="text-3xl">{project.emoji}</Span>
            )}
            <Div>
              <Div className="flex items-center gap-2">
                <H3 size="h5" className="mb-1">
                  {project.name}
                </H3>
              </Div>
              {project.description && (
                <P className="text-xs text-muted-foreground">{project.description}</P>
              )}
            </Div>
          </Div>
          <Badge className={getStatusColor(project.overallStatus)}>{project.overallStatus}</Badge>
        </Div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <Div layout={'col'} className="space-y-3 flex-1 flex flex-col">
          {/* Endpoints with Graphs */}
          {project.endpoints.map((endpoint, index) => {
            const githubUrl = getGithubUrlForEndpoint(endpoint.type)
            // Find matching service history
            const serviceId = `${project.id}-${endpoint.type}`
            const serviceHistory = servicesHistory.find(s => s.serviceId === serviceId)

            return (
              <Div key={index} className="space-y-2">
                <Div
                  onClick={() => {
                    if (githubUrl) {
                      window.open(githubUrl, '_blank', 'noopener,noreferrer')
                    }
                  }}
                  className="flex items-start justify-between p-3 rounded-md bg-muted/50 border transition-colors hover:bg-muted/40 hover:border-primary/50 cursor-pointer"
                >
                  <Div className="flex items-start gap-2 flex-1 min-w-0">
                    <Span className="mt-0.5">{getStatusEmoji(endpoint.status)}</Span>
                    <Div className="flex-1 min-w-0">
                      <Div className="flex items-center gap-2 flex-wrap">
                        <P className="text-sm font-medium">{endpoint.label}</P>
                        {endpoint.platform && getPlatformBadge(endpoint.platform)}
                        {/* Show endpoints count for APIs */}
                        {endpoint.metadata?.endpointsCount && (
                          <Badge variant="outline" className="text-xs bg-muted/50">
                            {endpoint.metadata.endpointsCount} routes
                          </Badge>
                        )}
                      </Div>

                      {/* URLs */}
                      <Div className="flex flex-col gap-1 mt-2">
                        {/* Main URL */}
                        <P asChild variant={'link'}>
                          <Link
                            href={endpoint.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-xs w-fit transition-colors block truncate inline-flex items-center gap-1"
                            title={endpoint.url}
                          >
                            <Icon name="lucide:ExternalLink" className="w-3 h-3 flex-shrink-0" />
                            {endpoint.url}
                          </Link>
                        </P>

                        {/* Swagger Docs URL for APIs */}
                        {endpoint.metadata?.swaggerUrl && (
                          <P asChild variant={'link'}>
                            <Link
                              href={endpoint.metadata.swaggerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-xs w-fit text-muted-foreground hover:text-primary transition-colors block truncate inline-flex items-center gap-1"
                              title={endpoint.metadata.swaggerUrl}
                            >
                              📖 {endpoint.metadata.swaggerUrl}
                            </Link>
                          </P>
                        )}
                      </Div>
                    </Div>
                  </Div>
                  <Div className="text-right ml-2 flex-shrink-0">
                    <P className="text-sm font-medium">
                      {endpoint.responseTime ? `${endpoint.responseTime}ms` : 'N/A'}
                    </P>
                    {endpoint.error && (
                      <P
                        className="text-xs text-destructive mt-1 max-w-[120px] truncate"
                        title={endpoint.error}
                      >
                        {endpoint.error}
                      </P>
                    )}
                  </Div>
                </Div>

                {/* Uptime Graph for this endpoint */}
                {!isLoadingHistory && serviceHistory && (
                  <UptimeGraph
                    data={serviceHistory.history}
                    uptimePercentage={serviceHistory.uptimePercentage}
                    height={20}
                    showPercentage={false}
                    showTitle={false}
                  />
                )}
              </Div>
            )
          })}
        </Div>
      </CardContent>
    </Card>
  )
}
