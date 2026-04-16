'use client'

import { useTranslations } from 'next-intl'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Div, P } from '@ezstart/ui/components'
import { Icon } from '@ezstart/ui/components'

type ConnectedAccount = {
  stripeAccountId: string
  email: string
  businessName: string
  accountType: 'standard' | 'express'
  status: 'pending' | 'active' | 'restricted' | 'disabled'
  chargesEnabled: boolean
  payoutsEnabled: boolean
  defaultFeePercent: number
  onboardedAt: string | null
  createdAt: string
}

type ConnectStatusCardProps = {
  account: ConnectedAccount
  onOpenDashboard: () => void
  onDisconnect: () => void
  isDashboardLoading: boolean
}

function statusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'restricted':
      return 'destructive'
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
  isDashboardLoading,
}: ConnectStatusCardProps) {
  const t = useTranslations('developer.connect')

  const statusKey = `status${account.status.charAt(0).toUpperCase()}${account.status.slice(1)}` as
    | 'statusPending'
    | 'statusActive'
    | 'statusRestricted'
    | 'statusDisabled'

  return (
    <Card>
      <CardHeader>
        <Div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon name="lucide:Link" className="h-5 w-5 text-primary" />
            {t('title')}
          </CardTitle>
          <Badge variant={statusVariant(account.status)}>{t(statusKey)}</Badge>
        </Div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Div className="grid gap-3 sm:grid-cols-2">
          <Div>
            <P size="sm" variant="description">
              {t('businessName')}
            </P>
            <P className="font-medium">{account.businessName}</P>
          </Div>
          <Div>
            <P size="sm" variant="description">
              {t('accountType')}
            </P>
            <P className="font-medium">
              {account.accountType === 'standard'
                ? t('accountTypeStandard')
                : t('accountTypeExpress')}
            </P>
          </Div>
          <Div>
            <P size="sm" variant="description">
              {t('chargesEnabled')}
            </P>
            <Badge variant={account.chargesEnabled ? 'success' : 'secondary'} size="sm">
              {account.chargesEnabled ? t('yes') : t('no')}
            </Badge>
          </Div>
          <Div>
            <P size="sm" variant="description">
              {t('payoutsEnabled')}
            </P>
            <Badge variant={account.payoutsEnabled ? 'success' : 'secondary'} size="sm">
              {account.payoutsEnabled ? t('yes') : t('no')}
            </Badge>
          </Div>
          {account.onboardedAt && (
            <Div>
              <P size="sm" variant="description">
                {t('connectedSince')}
              </P>
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
            {isDashboardLoading ? t('dashboard.loading') : t('dashboard.button')}
          </Button>
          <Button variant="destructive" size="sm" onClick={onDisconnect}>
            <Icon name="lucide:Unlink" className="mr-2 h-4 w-4" />
            {t('disconnect.button')}
          </Button>
        </Div>
      </CardContent>
    </Card>
  )
}
