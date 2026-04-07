'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, Div } from '@ezstart/ui/components'
import { PurchaseCard, PaymentHistory, usePurchases } from '@ezstart/pay-sdk'

export default function TestPurchasePage() {
  const t = useTranslations('test')
  const { user } = useAuth()
  const { purchases, isLoading } = usePurchases({ userId: user?._id, limit: 20 })

  return (
    <Div className="space-y-8">
      {/* Purchase Cards */}
      <Div className="grid sm:grid-cols-2 gap-6">
        <PurchaseCard
          appName="ezpay"
          productId="ezpay-test-item"
          productName={t('products.testItem')}
          description={t('products.testItemDesc')}
          amount={9.99}
          currency="EUR"
          userId={user?._id}
          userEmail={user?.email}
          userName={user?.username}
        />

        <PurchaseCard
          appName="ezpay"
          productId="ezpay-premium-pass"
          productName={t('products.premiumPass')}
          description={t('products.premiumPassDesc')}
          amount={24.99}
          currency="EUR"
          variant="featured"
          userId={user?._id}
          userEmail={user?.email}
          userName={user?.username}
        />
      </Div>

      {/* Purchase History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.history')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentHistory
            payments={purchases || []}
            loading={isLoading}
            emptyMessage={t('noPurchases')}
          />
        </CardContent>
      </Card>
    </Div>
  )
}
