'use client'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Div, Icon, P } from '@ezstart/ui/components'
import type { ConnectedAccount, ConnectAccountStatus } from '../core/types.js'

export interface ConnectStatusCardTexts {
  title?: string
  businessName?: string
  accountType?: string
  accountTypeStandard?: string
  accountTypeExpress?: string
  chargesEnabled?: string
  payoutsEnabled?: string
  connectedSince?: string
  yes?: string
  no?: string
  statusPending?: string
  statusActive?: string
  statusRestricted?: string
  statusDisabled?: string
  dashboardButton?: string
  dashboardLoading?: string
  disconnectButton?: string
}

export interface ConnectStatusCardProps {
  account: ConnectedAccount
  onOpenDashboard: () => void
  onDisconnect: () => void
  isDashboardLoading?: boolean
  className?: string
  texts?: ConnectStatusCardTexts
}

function statusVariant(status: ConnectAccountStatus): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'restricted':
    case 'disabled':
      return 'destructive'
    default:
      return 'secondary'
  }
}

export function ConnectStatusCard({
  account,
  onOpenDashboard,
  onDisconnect,
  isDashboardLoading = false,
  className,
  texts,
}: ConnectStatusCardProps) {
  const t = {
    title: texts?.title ?? 'Connected Account',
    businessName: texts?.businessName ?? 'Business Name',
    accountType: texts?.accountType ?? 'Account Type',
    accountTypeStandard: texts?.accountTypeStandard ?? 'Standard',
    accountTypeExpress: texts?.accountTypeExpress ?? 'Express',
    chargesEnabled: texts?.chargesEnabled ?? 'Charges Enabled',
    payoutsEnabled: texts?.payoutsEnabled ?? 'Payouts Enabled',
    connectedSince: texts?.connectedSince ?? 'Connected Since',
    yes: texts?.yes ?? 'Yes',
    no: texts?.no ?? 'No',
    statusPending: texts?.statusPending ?? 'Pending',
    statusActive: texts?.statusActive ?? 'Active',
    statusRestricted: texts?.statusRestricted ?? 'Restricted',
    statusDisabled: texts?.statusDisabled ?? 'Disabled',
    dashboardButton: texts?.dashboardButton ?? 'Open Dashboard',
    dashboardLoading: texts?.dashboardLoading ?? 'Loading...',
    disconnectButton: texts?.disconnectButton ?? 'Disconnect',
  }

  const statusLabels: Record<ConnectAccountStatus, string> = {
    pending: t.statusPending,
    active: t.statusActive,
    restricted: t.statusRestricted,
    disabled: t.statusDisabled,
  }

  return (
    <Card className={className}>
      <CardHeader>
        <Div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon name="lucide:Link" className="h-5 w-5 text-primary" />
            {t.title}
          </CardTitle>
          <Badge variant={statusVariant(account.status)}>
            {statusLabels[account.status]}
          </Badge>
        </Div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Div className="grid gap-3 sm:grid-cols-2">
          <Div>
            <P size="sm" variant="description">{t.businessName}</P>
            <P className="font-medium">{account.businessName}</P>
          </Div>
          <Div>
            <P size="sm" variant="description">{t.accountType}</P>
            <P className="font-medium">
              {account.accountType === 'standard' ? t.accountTypeStandard : t.accountTypeExpress}
            </P>
          </Div>
          <Div>
            <P size="sm" variant="description">{t.chargesEnabled}</P>
            <Badge variant={account.chargesEnabled ? 'success' : 'secondary'} size="sm">
              {account.chargesEnabled ? t.yes : t.no}
            </Badge>
          </Div>
          <Div>
            <P size="sm" variant="description">{t.payoutsEnabled}</P>
            <Badge variant={account.payoutsEnabled ? 'success' : 'secondary'} size="sm">
              {account.payoutsEnabled ? t.yes : t.no}
            </Badge>
          </Div>
          {account.onboardedAt && (
            <Div>
              <P size="sm" variant="description">{t.connectedSince}</P>
              <P className="font-medium">
                {new Date(account.onboardedAt).toLocaleDateString()}
              </P>
            </Div>
          )}
        </Div>

        <Div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            onClick={onOpenDashboard}
            disabled={isDashboardLoading || account.status !== 'active'}
          >
            <Icon name="lucide:ExternalLink" className="mr-2 h-4 w-4" />
            {isDashboardLoading ? t.dashboardLoading : t.dashboardButton}
          </Button>
          <Button variant="destructive" size="sm" onClick={onDisconnect}>
            <Icon name="lucide:Unlink" className="mr-2 h-4 w-4" />
            {t.disconnectButton}
          </Button>
        </Div>
      </CardContent>
    </Card>
  )
}
