'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
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
import { SubscribeButton, PaymentHistory, useSubscriptions, usePayContext } from '@ezstart/pay-sdk'

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
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const handleCancelSubscription = async (subscriptionId?: string) => {
    if (!subscriptionId) {
      alert(t('cancelNoSubscriptionId'))
      return
    }
    setCancellingId(subscriptionId)
    try {
      await client.cancelSubscription(subscriptionId)
      alert(t('cancelSuccess'))
      reload()
    } catch {
      alert(t('cancelError'))
    } finally {
      setCancellingId(null)
    }
  }

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
                      disabled={cancellingId === sub.metadata?.subscriptionId}
                      onClick={() => handleCancelSubscription(sub.metadata?.subscriptionId)}
                    >
                      {cancellingId === sub.metadata?.subscriptionId
                        ? t('loading')
                        : t('cancelSubscription')}
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
    </Div>
  )
}
