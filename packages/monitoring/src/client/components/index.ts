/**
 * @ezstart/monitoring - Client-side dashboard components
 *
 * Reusable monitoring UI components that accept data via props.
 * Use these in any Next.js app to display monitoring dashboards.
 *
 * @example
 * ```tsx
 * import { MonitoringDashboard, HealthScoreCard } from '@ezstart/monitoring/client'
 *
 * <MonitoringDashboard
 *   projects={projectsData}
 *   audits={auditsData}
 *   errors={errorsData}
 *   summary={summaryData}
 *   isLoading={isLoading}
 *   error={error}
 * />
 * ```
 */

export { MonitoringDashboard } from './MonitoringDashboard.js'
export type { MonitoringDashboardProps, MonitoringDashboardLabels } from './MonitoringDashboard.js'

export { SystemOverview } from './SystemOverview.js'
export type {
  SystemOverviewProps,
  SystemOverviewLabels,
  SystemOverviewProject,
  SystemOverviewAudit,
  SystemOverviewError,
  SystemOverviewSummary,
} from './SystemOverview.js'

export { HealthScoreCard } from './HealthScoreCard.js'
export type { HealthScoreCardProps } from './HealthScoreCard.js'

export { MetricCard } from './MetricCard.js'
export type { MetricCardProps } from './MetricCard.js'

export { ServiceStatusCard } from './ServiceStatusCard.js'
export type { ServiceStatusCardProps } from './ServiceStatusCard.js'

export { AuditCard } from './AuditCard.js'
export type { AuditCardProps, AuditCardData } from './AuditCard.js'

export { ErrorCard } from './ErrorCard.js'
export type { ErrorCardProps, ErrorLogData } from './ErrorCard.js'
