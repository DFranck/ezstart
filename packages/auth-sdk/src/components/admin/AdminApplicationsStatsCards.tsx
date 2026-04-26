'use client'

import { Card, Div, P } from '@ezstart/ui/components'
import type { AdminApplicationsTexts } from './AdminApplications.types.js'

export interface AdminApplicationsStatsCardsProps {
  total: number
  activeCount: number
  archivedCount: number
  platformOwnedCount: number
  themedCount: number
  t: Required<AdminApplicationsTexts>
}

/**
 * 5-up stats cards rendered above the admin Applications table. Internal
 * sub-component of `<AdminApplicationsDashboard>`.
 *
 * @internal
 */
export function AdminApplicationsStatsCards({
  total,
  activeCount,
  archivedCount,
  platformOwnedCount,
  themedCount,
  t,
}: AdminApplicationsStatsCardsProps) {
  return (
    <Div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <Card className="p-4">
        <P className="text-sm text-muted-foreground">{t.totalApplications}</P>
        <P className="text-2xl font-bold">{total}</P>
      </Card>
      <Card className="p-4">
        <P className="text-sm text-muted-foreground">{t.activeApplications}</P>
        <P className="text-2xl font-bold text-success">{activeCount}</P>
      </Card>
      <Card className="p-4">
        <P className="text-sm text-muted-foreground">{t.archivedApplications}</P>
        <P className="text-2xl font-bold text-muted-foreground">{archivedCount}</P>
      </Card>
      <Card className="p-4">
        <P className="text-sm text-muted-foreground">{t.platformOwned}</P>
        <P className="text-2xl font-bold">{platformOwnedCount}</P>
      </Card>
      <Card className="p-4">
        <P className="text-sm text-muted-foreground">{t.themedApplications}</P>
        <P className="text-2xl font-bold">{themedCount}</P>
      </Card>
    </Div>
  )
}
