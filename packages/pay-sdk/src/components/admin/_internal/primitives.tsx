'use client'

/**
 * Shared rendering primitives for the PayAdminDashboard internal sections.
 *
 * These are tiny adapters over @ezstart/ui to keep the section components
 * focused on data fetching + table layout rather than empty-state visuals.
 *
 * @internal
 */
import { Card, Div, Icon, P, Skeleton } from '@ezstart/ui/components'

export function StatCard({
  label,
  value,
  loading,
}: {
  label: string
  value: string | number
  loading: boolean
}) {
  return (
    <Card className="p-6">
      <P className="text-sm text-muted-foreground mb-1">{label}</P>
      {loading ? <Skeleton className="h-8 w-24" /> : <P className="text-2xl font-bold">{value}</P>}
    </Card>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Div className="flex flex-col items-center justify-center gap-4 p-12 rounded-lg border-2 border-dashed border-muted-foreground/20">
      <Icon name="lucide:Receipt" className="w-12 h-12 text-muted-foreground/40" />
      <P className="text-muted-foreground text-center">{message}</P>
    </Div>
  )
}
