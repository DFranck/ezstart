'use client'

import { Div, P, Spinner } from '@ezstart/ui/components'
import type { ReactNode } from 'react'
import {
  SystemOverview,
  type SystemOverviewAudit,
  type SystemOverviewError,
  type SystemOverviewProject,
  type SystemOverviewSummary,
  type SystemOverviewLabels,
} from './SystemOverview.js'

export interface MonitoringDashboardProps {
  /** Project / service data */
  projects: SystemOverviewProject[]
  /** Audit data */
  audits: SystemOverviewAudit[]
  /** Error logs */
  errors: SystemOverviewError[]
  /** Health summary counts */
  summary: SystemOverviewSummary
  /** Loading state — shows spinner when true */
  isLoading?: boolean
  /** Error object — shows error state when set */
  error?: Error | null
  /** Compact mode for embedding in other dashboards (reduces spacing) */
  compact?: boolean
  /** Optional slot to render custom quick-action buttons */
  quickActions?: ReactNode
  /** Custom labels for i18n */
  labels?: Partial<MonitoringDashboardLabels>
}

export interface MonitoringDashboardLabels extends SystemOverviewLabels {
  loadingText: string
  errorTitle: string
  errorApiOffline: string
}

const DEFAULT_DASHBOARD_LABELS = {
  loadingText: 'Loading monitoring data...',
  errorTitle: 'Failed to load monitoring data',
  errorApiOffline: 'Monitoring API is offline. Please check that the server is running.',
}

export function MonitoringDashboard({
  projects,
  audits,
  errors,
  summary,
  isLoading = false,
  error = null,
  compact = false,
  quickActions,
  labels: customLabels,
}: MonitoringDashboardProps) {
  const dashboardLabels = { ...DEFAULT_DASHBOARD_LABELS, ...customLabels }

  // Loading state
  if (isLoading) {
    return (
      <Div
        className={`flex flex-col items-center justify-center gap-4 ${compact ? 'py-10' : 'py-20'}`}
      >
        <Spinner size={compact ? 'lg' : 'xl'} text={dashboardLabels.loadingText} variant="fancy" />
      </Div>
    )
  }

  // Error state
  if (error) {
    const errorMessage =
      error.message === 'Failed to fetch' ? dashboardLabels.errorApiOffline : error.message

    return (
      <Div className={`flex items-center justify-center ${compact ? 'py-10' : 'py-20'}`}>
        <Div className="space-y-4 text-center max-w-lg">
          <Div className="text-6xl">{'\u26A0\uFE0F'}</Div>
          <P className="text-destructive font-semibold">{dashboardLabels.errorTitle}</P>
          <P className="text-muted-foreground">{errorMessage}</P>
        </Div>
      </Div>
    )
  }

  return (
    <Div className={compact ? 'space-y-4' : 'space-y-6'}>
      <SystemOverview
        projects={projects}
        audits={audits}
        errors={errors}
        summary={summary}
        quickActions={quickActions}
        labels={customLabels}
      />
    </Div>
  )
}
