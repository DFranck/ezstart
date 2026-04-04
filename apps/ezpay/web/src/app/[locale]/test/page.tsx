'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, Div, H3, P } from '@ezstart/ui/components'
import {
  DonateModal,
  DonationWall,
  PurchaseButton,
  SubscribeButton,
  PaymentHistory,
  usePaymentHistory,
} from '@ezstart/pay-sdk'

export default function TestPage() {
  const t = useTranslations('test')
  const { user } = useAuth()
  const { payments, isLoading: historyLoading } = usePaymentHistory({
    limit: 20,
  })

  return (
    <Div className="space-y-8">
      {/* Donations Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.donations')}</CardTitle>
          <P variant="description">{t('sections.donationsDesc')}</P>
        </CardHeader>
        <CardContent className="space-y-6">
          <DonateModal
            projectId="ezpay"
            projectName="EZPay Development"
            amounts={[5, 10, 25, 50]}
            currency="EUR"
            userId={user?._id}
            userEmail={user?.email}
            userName={user?.username}
          />
          <DonationWall projectId="ezpay" limit={5} texts={{ noDonationsText: t('noDonations') }} />
        </CardContent>
      </Card>

      {/* Purchases Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.purchases')}</CardTitle>
          <P variant="description">{t('sections.purchasesDesc')}</P>
        </CardHeader>
        <CardContent>
          <Div className="grid sm:grid-cols-2 gap-4">
            <Div className="p-4 border rounded-lg flex flex-col gap-3">
              <H3 className="font-semibold">{t('products.testItem')}</H3>
              <P size="sm" variant="description">
                {t('products.testItemDesc')}
              </P>
              <PurchaseButton
                projectId="ezpay"
                productId="ezpay-test-item"
                productName={t('products.testItem')}
                amount={9.99}
                currency="EUR"
                description={t('products.testItemDesc')}
                userId={user?._id}
                userEmail={user?.email}
                userName={user?.username}
              />
            </Div>
            <Div className="p-4 border rounded-lg flex flex-col gap-3">
              <H3 className="font-semibold">{t('products.premiumPass')}</H3>
              <P size="sm" variant="description">
                {t('products.premiumPassDesc')}
              </P>
              <PurchaseButton
                projectId="ezpay"
                productId="ezpay-premium-pass"
                productName={t('products.premiumPass')}
                amount={24.99}
                currency="EUR"
                description={t('products.premiumPassDesc')}
                userId={user?._id}
                userEmail={user?.email}
                userName={user?.username}
              />
            </Div>
          </Div>
        </CardContent>
      </Card>

      {/* Subscriptions Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.subscriptions')}</CardTitle>
          <P variant="description">{t('sections.subscriptionsDesc')}</P>
        </CardHeader>
        <CardContent>
          <Div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: 'monthly', priceId: 'ezpay-pro-monthly', amount: 9.99, interval: 1 },
              { key: 'quarterly', priceId: 'ezpay-pro-quarterly', amount: 24.99, interval: 3 },
              { key: 'biannual', priceId: 'ezpay-pro-biannual', amount: 44.99, interval: 6 },
              { key: 'yearly', priceId: 'ezpay-pro-yearly', amount: 79.99, interval: 12 },
            ].map(plan => (
              <Div key={plan.key} className="p-4 border rounded-lg flex flex-col gap-3">
                <H3 className="font-semibold text-sm">{t(`plans.${plan.key}` as const)}</H3>
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

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.history')}</CardTitle>
          <P variant="description">{t('sections.historyDesc')}</P>
        </CardHeader>
        <CardContent>
          <PaymentHistory
            payments={payments || []}
            loading={historyLoading}
            emptyMessage={t('noPurchases')}
          />
        </CardContent>
      </Card>
    </Div>
  )
}
