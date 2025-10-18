import { H1, P } from '@ezstart/ui/components'
import { MonitoringDashboard } from './components/MonitoringDashboard'

export default function MonitoringPage() {
  return (
    <>
      {/* Header */}
      <div className="space-y-2 mb-8">
        <H1>System Monitoring Dashboard</H1>
        <P className="text-muted-foreground">
          Real-time monitoring of all projects across the @ezstart monorepo
        </P>
      </div>

      {/* Client-side dashboard (no SSR blocking) */}
      <MonitoringDashboard />
    </>
  )
}
