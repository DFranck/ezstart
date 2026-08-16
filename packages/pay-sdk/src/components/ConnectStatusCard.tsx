'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  Icon,
  P,
} from '@ezstart/ui/components'
import type { ConnectedAccount, ConnectAccountStatus } from '../core/types.js'

/** Pending rows older than this can no longer be resumed. Mirrors `RESUME_EXPIRY_MS` in the API. */
const RESUME_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

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
  /** Label of the "Resume Stripe onboarding" button shown on pending < 7d rows. */
  resumeButton?: string
  /** Label shown while the resume request is in-flight. */
  resumeLoading?: string
}

export interface ConnectStatusCardProps {
  account: ConnectedAccount
  onOpenDashboard: () => void
  onDisconnect: () => void
  isDashboardLoading?: boolean
  /**
   * Click handler for the "Resume Stripe onboarding" button. Only rendered
   * when `account.status === 'pending'` AND `account.createdAt` is < 7 days
   * old. When omitted the button is hidden — keeps the component
   * backwards-compatible for callers that don't need resume.
   */
  onResume?: () => void
  /** True while the resume request is in-flight. Disables the button. */
  isResumeLoading?: boolean
  className?: string
  texts?: ConnectStatusCardTexts
}

function statusVariant(
  status: ConnectAccountStatus
): 'success' | 'warning' | 'destructive' | 'secondary' {
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
  onResume,
  isResumeLoading = false,
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
    resumeButton: texts?.resumeButton ?? 'Resume Stripe onboarding',
    resumeLoading: texts?.resumeLoading ?? 'Resuming…',
  }

  // The Resume button is only useful while the row is recoverable —
  // pending AND younger than 7 days. Past that the cleanup scheduler is
  // about to (or already did) delete the row, so the user will have to
  // restart from scratch via `<ConnectOnboardForm>`.
  const accountAgeMs = account.createdAt ? Date.now() - new Date(account.createdAt).getTime() : 0
  const canResume =
    !!onResume &&
    account.status === 'pending' &&
    accountAgeMs >= 0 &&
    accountAgeMs < RESUME_EXPIRY_MS

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
          <Badge variant={statusVariant(account.status)}>{statusLabels[account.status]}</Badge>
        </Div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Div className="grid gap-3 sm:grid-cols-2">
          <Div>
            <P size="sm" variant="description">
              {t.businessName}
            </P>
            <P className="font-medium">{account.businessName}</P>
          </Div>
          <Div>
            <P size="sm" variant="description">
              {t.accountType}
            </P>
            <P className="font-medium">
              {account.accountType === 'standard' ? t.accountTypeStandard : t.accountTypeExpress}
            </P>
          </Div>
          <Div>
            <P size="sm" variant="description">
              {t.chargesEnabled}
            </P>
            <Badge variant={account.chargesEnabled ? 'success' : 'secondary'} size="sm">
              {account.chargesEnabled ? t.yes : t.no}
            </Badge>
          </Div>
          <Div>
            <P size="sm" variant="description">
              {t.payoutsEnabled}
            </P>
            <Badge variant={account.payoutsEnabled ? 'success' : 'secondary'} size="sm">
              {account.payoutsEnabled ? t.yes : t.no}
            </Badge>
          </Div>
          {account.onboardedAt && (
            <Div>
              <P size="sm" variant="description">
                {t.connectedSince}
              </P>
              <P className="font-medium">{new Date(account.onboardedAt).toLocaleDateString()}</P>
            </Div>
          )}
        </Div>

        <Div className="flex flex-wrap gap-2 pt-2">
          {canResume && (
            <Button variant="default" size="sm" onClick={onResume} disabled={isResumeLoading}>
              <Icon name="lucide:RefreshCw" className="mr-2 h-4 w-4" />
              {isResumeLoading ? t.resumeLoading : t.resumeButton}
            </Button>
          )}
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
