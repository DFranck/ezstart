'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  H3,
  P,
} from '@ezstart/ui/components'
import {
  SubscribeButton,
  PaymentHistory,
  useSubscriptions,
  usePayContext,
  ConfirmActionDialog,
} from '@ezstart/pay-sdk'

const plans = [
  { key: 'monthly', priceId: 'ezpay-pro-monthly', amount: 9.99, interval: 1 },
  { key: 'quarterly', priceId: 'ezpay-pro-quarterly', amount: 24.99, interval: 3 },
  { key: 'biannual', priceId: 'ezpay-pro-biannual', amount: 44.99, interval: 6 },
  { key: 'yearly', priceId: 'ezpay-pro-yearly', amount: 79.99, interval: 12 },
] as const

export default function TestSubscribePage() {
  const t = useTranslations('test')
  const { user } = useAuth()
  const { client } = usePayContext()
  const { subscriptions, isLoading, reload } = useSubscriptions({ userId: user?._id, limit: 20 })
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean
    subscriptionId: string | null
  }>({ open: false, subscriptionId: null })

  const handleCancelConfirm = useCallback(async () => {
    if (!cancelDialog.subscriptionId) {
      throw new Error(t('cancelNoSubscriptionId'))
    }
    await client.cancelSubscription(cancelDialog.subscriptionId)
    reload()
  }, [cancelDialog.subscriptionId, client, reload, t])

  const activeSubscriptions = (subscriptions || []).filter(
    (s: { status: string }) => s.status === 'completed' || s.status === 'pending'
  )

  return (
    <Div className="space-y-8">
      {/* Subscribe Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.subscriptions')}</CardTitle>
          <P variant="description">{t('sections.subscriptionsDesc')}</P>
        </CardHeader>
        <CardContent>
          <Div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map(plan => (
              <Div key={plan.key} className="p-4 border rounded-lg flex flex-col gap-3">
                <H3 className="font-semibold text-sm">{t(`plans.${plan.key}` as const)}</H3>
                <P size="sm" variant="description">
                  {plan.amount} EUR / {plan.interval} {plan.interval === 1 ? 'mois' : 'mois'}
                </P>
                <SubscribeButton
                  projectId="ezpay"
                  priceId={plan.priceId}
                  planName={t(`plans.${plan.key}` as const)}
                  amount={plan.amount}
                  intervalCount={plan.interval}
                  currency="EUR"
                  userId={user?._id}
                  userEmail={user?.email}
                  userName={user?.username}
                />
              </Div>
            ))}
          </Div>
        </CardContent>
      </Card>

      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('sections.subscriptions')} — {t('active')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Div className="space-y-3">
              {activeSubscriptions.map(sub => (
                <Div
                  key={sub.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <Div>
                    <P className="font-medium">{sub.projectName || sub.projectId}</P>
                    <P size="sm" variant="description">
                      {sub.amount
                        ? `${(sub.amount / 100).toFixed(2)} ${sub.currency?.toUpperCase()}`
                        : ''}
                    </P>
                  </Div>
                  <Div className="flex items-center gap-2">
                    <Badge variant="success" dot>
                      {t('active')}
                    </Badge>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setCancelDialog({
                          open: true,
                          subscriptionId: sub.metadata?.subscriptionId || null,
                        })
                      }
                    >
                      {t('cancelSubscription')}
                    </Button>
                  </Div>
                </Div>
              ))}
            </Div>
          </CardContent>
        </Card>
      )}

      {/* Subscription History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.history')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentHistory
            payments={subscriptions || []}
            loading={isLoading}
            emptyMessage={t('noSubscriptions')}
          />
        </CardContent>
      </Card>

      {/* Cancel Subscription Confirmation Dialog */}
      <ConfirmActionDialog
        open={cancelDialog.open}
        onOpenChange={open => setCancelDialog(prev => ({ ...prev, open }))}
        title={t('cancelSubscription')}
        description={t('cancelConfirm')}
        onConfirm={handleCancelConfirm}
        variant="destructive"
        texts={{
          successMessage: t('cancelSuccess'),
          errorMessage: t('cancelError'),
        }}
      />
    </Div>
  )
}
