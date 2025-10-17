'use client'

import type { ProjectHealth } from '@ezstart/monitoring'
import { Badge, Card, CardContent, CardHeader, H3, Icon, P } from '@ezstart/ui/components'

interface ProjectCardProps {
  project: ProjectHealth
}

export function ProjectCard({ project }: ProjectCardProps) {
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
    <Card variant="floating" className="hover:border-primary/50 transition-colors">
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
                {/* GitHub Link */}
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="View on GitHub"
                  >
                    <Icon name="lucide:Github" className="w-4 h-4" />
                  </a>
                )}
              </div>
              {project.description && (
                <P className="text-xs text-muted-foreground">{project.description}</P>
              )}
            </div>
          </div>
          <Badge className={getStatusColor(project.overallStatus)}>{project.overallStatus}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Endpoints */}
          {project.endpoints.map((endpoint, index) => (
            <div
              key={index}
              className="flex items-start justify-between p-3 rounded-md bg-muted/50 transition-colors"
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
                      className="text-xs text-muted-foreground hover:text-primary transition-colors block truncate inline-flex items-center gap-1"
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
                        className="text-xs text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
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
          ))}

          {/* Summary */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">Overall Status</P>
              <P className="font-medium">
                {project.healthyCount}/{project.totalCount} healthy
              </P>
            </div>
            {project.avgResponseTime !== null && (
              <div className="flex items-center justify-between text-sm mt-1">
                <P className="text-muted-foreground">Avg Response</P>
                <P className="font-medium">{project.avgResponseTime}ms</P>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
