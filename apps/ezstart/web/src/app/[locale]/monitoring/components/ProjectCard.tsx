'use client'

import { Card, CardHeader, CardContent, Badge, H3, P } from '@ezstart/ui/components'
import type { ProjectHealth } from '@ezstart/monitoring'

interface ProjectCardProps {
  project: ProjectHealth
}

export function ProjectCard({ project }: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'degraded':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'unhealthy':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-muted text-muted-foreground'
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
      railway: 'bg-purple-500/10 text-purple-500',
      render: 'bg-blue-500/10 text-blue-500',
      vercel: 'bg-black/10 text-foreground dark:bg-white/10',
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
          <div className="flex items-center gap-2">
            <span className="text-2xl">{project.emoji}</span>
            <div>
              <H3 size="h5" className="mb-1">
                {project.name}
              </H3>
              {project.description && (
                <P className="text-xs text-muted-foreground">{project.description}</P>
              )}
            </div>
          </div>
          <Badge className={getStatusColor(project.overallStatus)}>
            {project.overallStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Endpoints */}
          {project.endpoints.map((endpoint, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded-md bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <span>{getStatusEmoji(endpoint.status)}</span>
                <div>
                  <P className="text-sm font-medium">{endpoint.label}</P>
                  {endpoint.platform && (
                    <div className="mt-1">{getPlatformBadge(endpoint.platform)}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <P className="text-sm font-medium">
                  {endpoint.responseTime ? `${endpoint.responseTime}ms` : 'N/A'}
                </P>
                {endpoint.error && (
                  <P className="text-xs text-destructive mt-1">{endpoint.error}</P>
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
