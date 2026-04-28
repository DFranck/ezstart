'use client'

import { Card, Div, P } from '@ezstart/ui/components'
import type { AuthUsersSectionTexts } from './types.js'

export interface AdminStatsCardsProps {
  total: number
  onlineCount: number
  superadminCount: number
  adminCount: number
  withAppRoles: number
  t: Required<AuthUsersSectionTexts>
}

/**
 * 5-up stats cards rendered above the admin users table. Internal
 * sub-component of `<AuthAdminDashboard>`.
 *
 * @internal
 */
export function AdminStatsCards({
  total,
  onlineCount,
  superadminCount,
  adminCount,
  withAppRoles,
  t,
}: AdminStatsCardsProps) {
  return (
    <Div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <Card className="p-4">
        <P className="text-sm text-muted-foreground">{t.totalUsers}</P>
        <P className="text-2xl font-bold">{total}</P>
      </Card>
      <Card className="p-4">
        <P className="text-sm text-muted-foreground">{t.online}</P>
        <P className="text-2xl font-bold text-success">{onlineCount}</P>
      </Card>
      <Card className="p-4">
        <P className="text-sm text-muted-foreground">{t.superadmins}</P>
        <P className="text-2xl font-bold">{superadminCount}</P>
      </Card>
      <Card className="p-4">
        <P className="text-sm text-muted-foreground">{t.admins}</P>
        <P className="text-2xl font-bold">{adminCount}</P>
      </Card>
      <Card className="p-4">
        <P className="text-sm text-muted-foreground">{t.withAppRoles}</P>
        <P className="text-2xl font-bold">{withAppRoles}</P>
      </Card>
    </Div>
  )
}
