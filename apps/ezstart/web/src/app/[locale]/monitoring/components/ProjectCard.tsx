'use client'

import { useEffect, useState } from 'react'
import type { ProjectHealth } from '@ezstart/monitoring'
import { Badge, Card, CardContent, CardHeader, Div, H3, Icon, P, UptimeGraph } from '@ezstart/ui/components'
import type { UptimeDataPoint } from '@ezstart/ui/components'

interface ProjectCardProps {
  project: ProjectHealth
}

interface ServiceHistory {
  serviceId: string
  totalChecks: number
  healthyChecks: number
  uptimePercentage: number
  avgResponseTime: number | null
  history: UptimeDataPoint[]
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [servicesHistory, setServicesHistory] = useState<ServiceHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  // Fetch health check history for the project
  useEffect(() => {
    async function fetchHistory() {
      try {
        setIsLoadingHistory(true)
        const MONITORING_API_URL =
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:5080'
            : 'https://ezstart-monitoring.up.railway.app'

        const res = await fetch(`${MONITORING_API_URL}/api/history/project/${project.id}?hours=24`)
        if (!res.ok) throw new Error('Failed to fetch history')

        const data = await res.json()
        setServicesHistory(data.services || [])
      } catch (error) {
        console.error('Failed to fetch project history:', error)
        setServicesHistory([])
      } finally {
        setIsLoadingHistory(false)
      }
    }

    fetchHistory()
  }, [project.id])

  const getGithubUrlForEndpoint = (endpointType: string) => {
    if (!project.githubUrl) return null
    // Si le githubUrl pointe déjà vers un sous-dossier (api ou web), le retourner tel quel
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
    <Card
      variant="floating"
      onClick={e => {
        if (project.githubUrl) {
          window.open(project.githubUrl, '_blank', 'noopener,noreferrer')
        }
      }}
      className="hover:border-primary/50 transition-colors flex flex-col cursor-pointer"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Logo or Emoji */}
            {project.logo ? (
              <img
                src={project.logo}
                alt={`${project.name} logo`}
                className="w-10 h-10 object-contain rounded-md"
              />
            ) : (
              <span className="text-3xl">{project.emoji}</span>
            )}
            <div>
              <div className="flex items-center gap-2">
                <H3 size="h5" className="mb-1">
                  {project.name}
                </H3>
              </div>
              {project.description && (
                <P className="text-xs text-muted-foreground">{project.description}</P>
              )}
            </div>
          </div>
          <Badge className={getStatusColor(project.overallStatus)}>{project.overallStatus}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <Div layout={'col'} className="space-y-3 flex-1 flex flex-col">
          {/* Endpoints */}
          {project.endpoints.map((endpoint, index) => {
            const githubUrl = getGithubUrlForEndpoint(endpoint.type)
            return (
              <div
                key={index}
                onClick={() => {
                  if (githubUrl) {
                    window.open(githubUrl, '_blank', 'noopener,noreferrer')
                  }
                }}
                className="flex items-start justify-between p-3 rounded-md bg-muted/50 border transition-colors hover:bg-muted/40 hover:border-primary/50 cursor-pointer"
              >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span className="mt-0.5">{getStatusEmoji(endpoint.status)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <P className="text-sm font-medium">{endpoint.label}</P>
                    {endpoint.platform && getPlatformBadge(endpoint.platform)}
                    {/* Show endpoints count for APIs */}
                    {endpoint.metadata?.endpointsCount && (
                      <Badge variant="outline" className="text-xs bg-muted/50">
                        {endpoint.metadata.endpointsCount} routes
                      </Badge>
                    )}
                  </div>

                  {/* URLs */}
                  <div className="flex flex-col gap-1 mt-2">
                    {/* Main URL */}
                    <a
                      href={endpoint.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs w-fit text-muted-foreground hover:text-primary transition-colors block truncate inline-flex items-center gap-1"
                      title={endpoint.url}
                    >
                      <Icon name="lucide:ExternalLink" className="w-3 h-3 flex-shrink-0" />
                      {endpoint.url}
                    </a>

                    {/* Swagger Docs URL for APIs */}
                    {endpoint.metadata?.swaggerUrl && (
                      <a
                        href={endpoint.metadata.swaggerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs w-fit text-muted-foreground hover:text-primary transition-colors block truncate inline-flex items-center gap-1"
                        title={endpoint.metadata.swaggerUrl}
                      >
                        📖 {endpoint.metadata.swaggerUrl}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right ml-2 flex-shrink-0">
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
              </div>
            </div>
            )
          })}

          {/* Uptime Graphs */}
          <div className="pt-2 border-t border-border mt-auto space-y-3">
            {isLoadingHistory ? (
              <P className="text-xs text-muted-foreground text-center py-4">Loading history...</P>
            ) : servicesHistory.length > 0 ? (
              servicesHistory.map(service => {
                // Determine title based on serviceId (e.g., "ezauth-api" → "API", "ezauth-web" → "Web")
                const title = service.serviceId.includes('-api')
                  ? 'API'
                  : service.serviceId.includes('-web')
                    ? 'Web'
                    : service.serviceId

                return (
                  <UptimeGraph
                    key={service.serviceId}
                    data={service.history}
                    title={title}
                    uptimePercentage={service.uptimePercentage}
                    height={60}
                    showPercentage
                    showTitle
                  />
                )
              })
            ) : (
              <div className="text-center py-4">
                <P className="text-xs text-muted-foreground">No history data available</P>
                <P className="text-xs text-muted-foreground mt-1">
                  Health checks will appear here after monitoring starts
                </P>
              </div>
            )}

            {/* Overall Summary */}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <P className="text-muted-foreground">Overall Status</P>
              <P className="font-medium">
                {project.healthyCount}/{project.totalCount} healthy
              </P>
            </div>
          </div>
        </Div>
      </CardContent>
    </Card>
  )
}
