'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { useAuthStore } from '@ezstart/auth-sdk'
import {
  PayProvider,
  DonateButton,
  DonateModal,
  PurchaseButton,
  SubscribeButton,
  usePayContext,
  formatCurrency,
  type Plan,
} from '@ezstart/pay-sdk'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  H1,
  H3,
  Input,
  Label,
  P,
  Skeleton,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

/**
 * Application id resolved at build time from `NEXT_PUBLIC_EZAUTH_APP_ID`
 * (see `.env.local`). Required to scope pay-sdk queries to the green-pulse
 * tenant instead of the deprecated `appName` legacy path.
 */
const applicationId = process.env.NEXT_PUBLIC_EZAUTH_APP_ID

function TestContent() {
  const t = useTranslations('admin.testPayments')
  const { user } = useAuth()
  const { client } = usePayContext()
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [promoCode, setPromoCode] = useState('')

  useEffect(() => {
    client
      .listPlans({ applicationId, active: true })
      .then(res => setPlans(res.data || []))
      .catch(() => {})
      .finally(() => setPlansLoading(false))
  }, [client])

  return (
    <Div className="space-y-8">
      <Div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-center">
        <P className="text-warning font-bold">{t('testModeBanner')}</P>
        <P size="sm" variant="description">
          {t('testModeDescription')}
        </P>
      </Div>

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
              placeholder="EARTHDAY2026"
              className="flex-1"
            />
          </Div>
        </CardContent>
      </Card>

      {/* Donations */}
      <Card>
        <CardHeader>
          <CardTitle>{t('donations.title')}</CardTitle>
          <P variant="description">{t('donations.description')}</P>
        </CardHeader>
        <CardContent>
          <Div className="flex flex-wrap gap-4">
            {[5, 10, 25].map(amount => (
              <DonateModal
                key={amount}
                projectId="green-pulse"
                projectName="GreenPulse"
                amounts={[amount]}
                currency="EUR"
                userId={user?._id}
                userEmail={user?.email}
                userName={user?.username}
                trigger={<DonateButton>&#10084; &euro;{amount}</DonateButton>}
              />
            ))}
          </Div>
        </CardContent>
      </Card>

      {/* Purchases */}
      <Card>
        <CardHeader>
          <CardTitle>{t('purchases.title')}</CardTitle>
          <P variant="description">{t('purchases.description')}</P>
        </CardHeader>
        <CardContent>
          <Div className="grid sm:grid-cols-2 gap-4">
            <Div className="p-4 border rounded-lg flex flex-col gap-3">
              <H3 className="font-semibold">{t('purchases.esgReport')}</H3>
              <P size="sm" variant="description">
                {t('purchases.esgReportDesc')}
              </P>
              <PurchaseButton
                projectId="green-pulse"
                productId="gp-report"
                productName={t('purchases.esgReport')}
                amount={19.99}
                currency="EUR"
                userId={user?._id}
                userEmail={user?.email}
                userName={user?.username}
              />
            </Div>
          </Div>
        </CardContent>
      </Card>

      {/* Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('subscriptions.title')}</CardTitle>
          <P variant="description">{t('subscriptions.description')}</P>
        </CardHeader>
        <CardContent>
          {plansLoading ? (
            <Div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-lg" />
              ))}
            </Div>
          ) : plans.length === 0 ? (
            <P variant="description">{t('subscriptions.noPlans')}</P>
          ) : (
            <Div className="grid sm:grid-cols-2 gap-4">
              {plans.map(plan => (
                <Div key={plan.id} className="p-4 border rounded-lg flex flex-col gap-3">
                  <H3 className="font-semibold">{plan.name}</H3>
                  {plan.description && (
                    <P size="sm" variant="description">
                      {plan.description}
                    </P>
                  )}
                  <P size="lg" className="font-bold">
                    {formatCurrency(plan.amount / 100, plan.currency)} / {plan.intervalCount}{' '}
                    {plan.interval === 'year' ? t('subscriptions.year') : t('subscriptions.month')}
                  </P>
                  <SubscribeButton
                    projectId="green-pulse"
                    priceId={plan.stripePriceId || plan.id}
                    planName={plan.name}
                    amount={plan.amount / 100}
                    intervalCount={plan.intervalCount}
                    currency={plan.currency}
                    userId={user?._id}
                    userEmail={user?.email}
                    userName={user?.username}
                    promoCode={promoCode || undefined}
                    showPromoInput
                  />
                </Div>
              ))}
            </Div>
          )}
        </CardContent>
      </Card>
    </Div>
  )
}

export default function TestPaymentsPage() {
  const t = useTranslations('admin')
  const { accessToken } = useAuthStore()

  return (
    <>
      <H1 className="mb-6">{t('testPayments.pageTitle')}</H1>
      <PayProvider applicationId={applicationId} getToken={() => accessToken}>
        <TestContent />
      </PayProvider>
    </>
  )
}
