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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useEffect, useState } from 'react'

interface ActivityLog {
  id: string
  type: 'error' | 'deployment' | 'health_change' | 'audit_update'
  severity: 'critical' | 'error' | 'warning' | 'info' | 'success'
  title: string
  message: string
  source: string
  project?: string
  timestamp: string
  metadata?: Record<string, any>
  url?: string
}

interface ActivityFeedProps {
  apiUrl: string
}

export function ActivityFeed({ apiUrl }: ActivityFeedProps) {
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'error' | 'deployment' | 'health_change' | 'audit_update'>('all')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Fetch activity logs
  const fetchActivity = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const timestamp = Date.now()
      const response = await fetch(`${apiUrl}/api/activity?_t=${timestamp}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch activity logs: ${response.status}`)
      }

      const data = await response.json()
      setAllLogs(data.logs || [])
      setLastRefresh(new Date())
    } catch (err) {
      console.error('[ActivityFeed] Error fetching activity:', err)
      setError(err instanceof Error ? err.message : 'Failed to load activity logs')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchActivity()
  }, [apiUrl])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[ActivityFeed] Auto-refreshing activity logs...')
      fetchActivity()
    }, 2 * 60 * 1000) // 2 minutes

    return () => clearInterval(interval)
  }, [apiUrl])

  // Filter logs based on active filter
  const filteredLogs = activeFilter === 'all'
    ? allLogs
    : allLogs.filter(log => log.type === activeFilter)

  // Count by type
  const counts = {
    all: allLogs.length,
    error: allLogs.filter(log => log.type === 'error').length,
    deployment: allLogs.filter(log => log.type === 'deployment').length,
    health_change: allLogs.filter(log => log.type === 'health_change').length,
    audit_update: allLogs.filter(log => log.type === 'audit_update').length,
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Spinner size="lg" text="Loading activity logs..." />
      </div>
    )
  }

  if (error) {
    return (
      <Card variant="ghost">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Icon name="lucide:AlertTriangle" className="w-12 h-12 text-destructive" />
            <P className="text-destructive font-semibold">Failed to load activity logs</P>
            <P className="text-muted-foreground text-sm">{error}</P>
            <Button onClick={fetchActivity} variant="outline" size="sm">
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
          <H3>Activity Feed</H3>
          <P className="text-sm text-muted-foreground">
            Recent errors, deployments, and system events
          </P>
        </Div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchActivity}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Icon name="lucide:RefreshCw" className="w-4 h-4" />
            Refresh
          </Button>
          {lastRefresh && (
            <P className="text-xs text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </P>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setActiveFilter(value as typeof activeFilter)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="error">Errors ({counts.error})</TabsTrigger>
          <TabsTrigger value="deployment">Deploys ({counts.deployment})</TabsTrigger>
          <TabsTrigger value="health_change">Health ({counts.health_change})</TabsTrigger>
          <TabsTrigger value="audit_update">Audits ({counts.audit_update})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="mt-6">
          {filteredLogs.length === 0 ? (
            <Card variant="ghost">
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Icon name="lucide:CheckCircle" className="w-12 h-12 text-muted-foreground" />
                  <P className="text-muted-foreground">No recent activity</P>
                  <P className="text-sm text-muted-foreground">
                    {activeFilter === 'error' && 'All systems are healthy 🎉'}
                    {activeFilter === 'deployment' && 'No recent deployments'}
                    {activeFilter === 'health_change' && 'All services stable'}
                    {activeFilter === 'audit_update' && 'No audit updates'}
                    {activeFilter === 'all' && 'Activity feed is empty'}
                  </P>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <ActivityCard key={log.id} log={log} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Activity Card Component
 */
function ActivityCard({ log }: { log: ActivityLog }) {
  const severityConfig = {
    critical: {
      bg: 'bg-destructive/10',
      border: 'border-destructive',
      icon: 'lucide:AlertOctagon',
      iconColor: 'text-destructive',
    },
    error: {
      bg: 'bg-destructive/10',
      border: 'border-destructive',
      icon: 'lucide:XCircle',
      iconColor: 'text-destructive',
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500',
      icon: 'lucide:AlertTriangle',
      iconColor: 'text-yellow-600 dark:text-yellow-500',
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500',
      icon: 'lucide:Info',
      iconColor: 'text-blue-600 dark:text-blue-500',
    },
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500',
      icon: 'lucide:CheckCircle',
      iconColor: 'text-green-600 dark:text-green-500',
    },
  } as const

  const config = severityConfig[log.severity]

  const typeConfig = {
    error: { label: 'Error', color: 'destructive' },
    deployment: { label: 'Deployment', color: 'default' },
    health_change: { label: 'Health', color: 'default' },
    audit_update: { label: 'Audit', color: 'default' },
  }

  const typeInfo = typeConfig[log.type]

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
              <div className="flex items-center gap-2 mb-1">
                <P className="font-semibold text-sm">{log.title}</P>
                <Badge variant={typeInfo.color as 'default' | 'destructive'} className="text-xs">
                  {typeInfo.label}
                </Badge>
              </div>
              <P className="text-sm text-muted-foreground">{log.message}</P>
              <div className="flex items-center gap-3 mt-2">
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
              className="text-primary hover:underline text-sm flex items-center gap-1"
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
