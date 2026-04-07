'use client'

import { useAuth } from '@ezstart/auth-sdk'
import {
  ConfirmActionDialog,
  formatCurrency,
  PaymentHistory,
  SubscriptionPlanCard,
  usePayContext,
  useSubscriptions,
  type Payment,
  type Plan,
} from '@ezstart/pay-sdk'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  H3,
  Input,
  Label,
  P,
  Skeleton,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

export default function TestSubscribePage() {
  const t = useTranslations('test')
  const { user } = useAuth()
  const { client } = usePayContext()
  const { subscriptions, isLoading, reload } = useSubscriptions({ limit: 20 })
  const [promoCode, setPromoCode] = useState('')
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)

  useEffect(() => {
    client
      .listPlans({ appName: 'ezpay', active: true })
      .then(res => {
        setPlans(res.data || [])
      })
      .catch(() => {})
      .finally(() => setPlansLoading(false))
  }, [client])
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
      {/* Promo Code */}
      <Card>
        <CardHeader>
          <CardTitle>{t('promoCode')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Div className="flex items-center gap-3 max-w-md">
            <Label htmlFor="promo-code">{t('promoCode')}</Label>
            <Input
              id="promo-code"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value)}
              placeholder={t('promoCodePlaceholder')}
              className="flex-1"
            />
          </Div>
          {promoCode && (
            <P size="sm" variant="description" className="mt-2">
              {t('promoCodeApplied', { code: promoCode })}
            </P>
          )}
        </CardContent>
      </Card>

      {/* Subscribe Buttons — using SubscriptionPlanCard */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.subscriptions')}</CardTitle>
          <P variant="description">{t('sections.subscriptionsDesc')}</P>
        </CardHeader>
        <CardContent>
          {plansLoading ? (
            <Div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[400px] w-full rounded-xl" />
              ))}
            </Div>
          ) : plans.length === 0 ? (
            <Div className="text-center py-8">
              <P className="text-muted-foreground">{t('noPlans')}</P>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <a href="/admin">{t('goToAdmin')}</a>
              </Button>
            </Div>
          ) : (
            <Div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan, index) => (
                <SubscriptionPlanCard
                  key={plan.id}
                  appName="ezpay"
                  planId={plan.id}
                  variant={index === 1 ? 'featured' : 'default'}
                  promoCode={promoCode || undefined}
                  userId={user?._id}
                  userEmail={user?.email}
                  userName={user?.username}
                />
              ))}
            </Div>
          )}
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
              {activeSubscriptions.map((sub: Payment) => (
                <Div
                  key={sub.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <Div>
                    <P className="font-medium">{sub.projectName || sub.projectId}</P>
                    <P size="sm" variant="description">
                      {sub.amount ? formatCurrency(sub.amount, sub.currency) : ''}
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
        onOpenChange={(open: boolean) => setCancelDialog(prev => ({ ...prev, open }))}
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
