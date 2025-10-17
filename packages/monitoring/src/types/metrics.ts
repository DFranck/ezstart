/**
 * Types for monitoring metrics and dashboard
 */

export interface MonitoringMetrics {
  // System health
  services: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
    unknown: number
  }

  // Audits
  audits: {
    total: number
    complete: number
    partial: number
    notAudited: number
    averageScore: number | null
    overdue: number
  }

  // Deployments
  deployments: {
    total: number
    active: number
    deploying: number
    failed: number
    inactive: number
  }

  // Databases
  databases: {
    total: number
    connected: number
    disconnected: number
    averageResponseTime: number | null
  }

  // Git/Development
  git: {
    uncommittedChanges: number
    unpushedCommits: number
    lastCommitAge: number // hours
    commitFrequency: 'active' | 'moderate' | 'stale'
  }

  // Overall health score
  overallHealth: {
    score: number // 0-100
    status: 'excellent' | 'good' | 'fair' | 'poor'
    lastUpdated: Date
  }
}

export interface MonitoringDashboard {
  metrics: MonitoringMetrics
  services: ServiceHealthSummary[]
  audits: AuditSummary[]
  deployments: DeploymentSummary[]
  recentIssues: MonitoringIssue[]
  upcomingTasks: MonitoringTask[]
}

export interface ServiceHealthSummary {
  name: string
  type: 'api' | 'web' | 'database'
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  uptime: number // percentage
  responseTime: number | null // ms
  lastCheck: Date
}

export interface AuditSummary {
  type: string
  name: string
  emoji: string
  status: 'not-audited' | 'in-progress' | 'partial' | 'complete'
  score: number | null
  lastUpdated: Date | null
  nextDue: Date | null
  overdue: boolean
}

export interface DeploymentSummary {
  name: string
  platform: 'railway' | 'vercel'
  status: 'active' | 'deploying' | 'failed' | 'inactive'
  url: string
  lastDeployedAt: Date | null
  healthStatus: 'healthy' | 'unhealthy' | 'unknown'
}

export interface MonitoringIssue {
  id: string
  type: 'service' | 'audit' | 'deployment' | 'database' | 'git'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  createdAt: Date
  resolvedAt: Date | null
  status: 'open' | 'in-progress' | 'resolved'
}

export interface MonitoringTask {
  id: string
  type: 'audit' | 'maintenance' | 'update' | 'fix'
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  dueDate: Date
  status: 'pending' | 'in-progress' | 'completed'
  assignee: string | null
}

export interface ContinuousImprovement {
  id: string
  category: 'performance' | 'security' | 'code-quality' | 'ux' | 'architecture'
  title: string
  description: string
  currentState: string
  desiredState: string
  actionItems: string[]
  estimatedEffort: 'low' | 'medium' | 'high'
  priority: 'critical' | 'high' | 'medium' | 'low'
  createdAt: Date
  completedAt: Date | null
  metrics?: {
    before: number
    after: number | null
    unit: string
  }
}
